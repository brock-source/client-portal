import { Router } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/auth";
import { AppError } from "../utils/appError";
import { validateBody, validateParams } from "../validation/validator";
import { z } from "zod";
import logger from "../utils/logger";
import { sendAdminMessageEmail } from "../services/adminMessageEmail";
import {
  assertPriorItemsComplete,
  describeCurrentStep,
  getChecklistForPhase,
  isPhaseChecklistComplete,
  phaseRequiresSequentialCompletion,
  uncompleteChecklistItemCascade,
} from "../services/checklist";
import * as schemas from "../validation/schemas";

export const clientRouter = Router();
clientRouter.use(requireRole("CLIENT"));

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

async function getOwnClient(userId: string) {
  return prisma.client.findUnique({ where: { userId } });
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const client = await getOwnClient(req.session.userId!);
    if (!client) return cb(new Error("Client profile not found"), "");
    const dir = path.join(UPLOAD_ROOT, client.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const categoryIdParamSchema = z.object({ categoryId: z.string().cuid() });
const itemIdParamSchema = z.object({ itemId: z.string().cuid() });
const phaseParamSchema = z.object({ phase: z.coerce.number().int().min(1).max(4) });
const notificationIdParamSchema = z.object({ id: z.string().cuid() });

clientRouter.get("/onboarding", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const [progress, categories, documents, missingFlags, phase2Checklist, phase3Checklist] = await Promise.all([
    prisma.onboardingProgress.findMany({ where: { clientId: client.id }, orderBy: { phase: "asc" } }),
    prisma.documentCategory.findMany({ where: { phase: 1 }, orderBy: { sortOrder: "asc" } }),
    prisma.document.findMany({ where: { clientId: client.id } }),
    prisma.missingDocumentFlag.findMany({ where: { clientId: client.id } }),
    getChecklistForPhase(client.id, 2),
    getChecklistForPhase(client.id, 3),
  ]);

  const uploadedByCategory = new Map(documents.map((d) => [d.categoryId, d]));
  const missingByCategory = new Set(missingFlags.map((f) => f.categoryId));
  const allPhasesComplete = progress.every((p) => p.status === "COMPLETE");

  const totalCategories = categories.length;
  const currentPhase =
    progress.find((p) => p.status === "IN_PROGRESS")?.phase ?? progress.filter((p) => p.status === "COMPLETE").length;
  const currentPhaseStatus = progress.find((p) => p.phase === currentPhase)?.status ?? "LOCKED";
  const currentStepLabel = describeCurrentStep(currentPhase, currentPhaseStatus, {
    phase1: { uploaded: uploadedByCategory.size, total: totalCategories },
    phase2Items: phase2Checklist,
    phase3Items: phase3Checklist,
    legacyHandoffCompletedAt: client.legacyHandoffCompletedAt,
  });

  let nextActionHint: string | null = null;
  if (currentPhaseStatus === "IN_PROGRESS" && currentPhase === 1) {
    const nextCategory = categories.find((c) => !uploadedByCategory.has(c.id));
    nextActionHint = nextCategory ? `Upload ${nextCategory.label}` : null;
  } else if (currentPhaseStatus === "IN_PROGRESS" && currentPhase === 2) {
    const nextItem = phase2Checklist.find((i) => !i.completed);
    nextActionHint = nextItem ? `Complete "${nextItem.label}"` : null;
  }

  res.ok({
    client: {
      id: client.id,
      firstName: client.firstName,
      householdLabel: client.householdLabel,
      healthRating: client.healthRating,
      welcomeSeenAt: client.welcomeSeenAt,
    },
    progress,
    allPhasesComplete,
    currentPhase,
    currentStepLabel,
    nextActionHint,
    phase1Categories: categories.map((cat) => ({
      id: cat.id,
      key: cat.key,
      label: cat.label,
      hint: cat.hint,
      uploaded: uploadedByCategory.has(cat.id),
      missing: missingByCategory.has(cat.id),
      document: uploadedByCategory.has(cat.id)
        ? {
            filename: uploadedByCategory.get(cat.id)!.filename,
            uploadedAt: uploadedByCategory.get(cat.id)!.uploadedAt,
          }
        : null,
    })),
    phase2Checklist,
    phase3Checklist,
    phase4: {
      legacyHandoffCompletedAt: client.legacyHandoffCompletedAt,
    },
  });
});

async function assertPhaseReachable(clientId: string, phase: number) {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { clientId_phase: { clientId, phase } },
  });
  if (!progress || progress.status === "LOCKED") {
    throw new AppError(400, "PHASE_LOCKED", "This phase isn't active yet.");
  }
}

clientRouter.post("/checklist/:itemId/complete", validateParams(itemIdParamSchema), async (req, res) => {
  const { itemId } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Unknown checklist item");
  if (item.completedBy !== "CLIENT") {
    throw new AppError(403, "NOT_CLIENT_ITEM", "This step is completed by your advisor team.");
  }

  try {
    await assertPhaseReachable(client.id, item.phase);
    if (phaseRequiresSequentialCompletion(item.phase)) {
      await assertPriorItemsComplete(client.id, item.phase, item.sortOrder);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, "STEP_INCOMPLETE", "Cannot complete this step yet.");
  }

  await prisma.checklistCompletion.upsert({
    where: { clientId_itemId: { clientId: client.id, itemId: item.id } },
    update: {},
    create: { clientId: client.id, itemId: item.id, completedByUserId: req.session.userId! },
  });

  res.created({ ok: true });
});

clientRouter.post("/checklist/:itemId/incomplete", validateParams(itemIdParamSchema), async (req, res) => {
  const { itemId } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Unknown checklist item");
  if (item.completedBy !== "CLIENT") {
    throw new AppError(403, "NOT_CLIENT_ITEM", "This step is completed by your advisor team.");
  }

  try {
    await assertPhaseReachable(client.id, item.phase);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, "CANNOT_EDIT_STEP", "Cannot edit this step.");
  }

  if (phaseRequiresSequentialCompletion(item.phase)) {
    await uncompleteChecklistItemCascade(client.id, item.phase, item.sortOrder);
  } else {
    await prisma.checklistCompletion.deleteMany({ where: { clientId: client.id, itemId: item.id } });
  }

  res.ok({ ok: true });
});

clientRouter.post("/welcome-seen", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const progress = await prisma.onboardingProgress.findMany({ where: { clientId: client.id } });
  const allComplete = progress.length === 4 && progress.every((p) => p.status === "COMPLETE");
  if (!allComplete) {
    throw new AppError(400, "ONBOARDING_INCOMPLETE", "Onboarding isn't complete yet.");
  }

  await prisma.client.update({ where: { id: client.id }, data: { welcomeSeenAt: new Date() } });
  res.ok({ ok: true });
});

clientRouter.post("/documents/:categoryId", validateParams(categoryIdParamSchema), upload.single("file"), async (req, res) => {
  const { categoryId } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");
  if (!req.file) throw new AppError(400, "NO_FILE", "No file uploaded");

  const category = await prisma.documentCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, "CATEGORY_NOT_FOUND", "Unknown document category");

  const existing = await prisma.document.findFirst({
    where: { clientId: client.id, categoryId: category.id },
  });

  if (existing) {
    await prisma.document.update({
      where: { id: existing.id },
      data: {
        filename: req.file.originalname,
        storedPath: req.file.path,
        uploadedByUserId: req.session.userId!,
        uploadedAt: new Date(),
      },
    });
    fs.unlink(existing.storedPath, () => {});
  } else {
    await prisma.document.create({
      data: {
        clientId: client.id,
        categoryId: category.id,
        filename: req.file.originalname,
        storedPath: req.file.path,
        uploadedByUserId: req.session.userId!,
      },
    });
  }

  await prisma.missingDocumentFlag.deleteMany({ where: { clientId: client.id, categoryId: category.id } });

  res.created({ ok: true });
});

clientRouter.post("/documents/:categoryId/missing", validateParams(categoryIdParamSchema), async (req, res) => {
  const { categoryId } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const category = await prisma.documentCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, "CATEGORY_NOT_FOUND", "Unknown document category");

  const existing = await prisma.document.findFirst({ where: { clientId: client.id, categoryId: category.id } });
  if (existing) {
    throw new AppError(400, "DOCUMENT_EXISTS", "This category already has a document — replace it instead.");
  }

  await prisma.missingDocumentFlag.upsert({
    where: { clientId_categoryId: { clientId: client.id, categoryId: category.id } },
    update: { markedAt: new Date() },
    create: { clientId: client.id, categoryId: category.id },
  });

  res.created({ ok: true });
});

clientRouter.post("/phases/:phase/schedule-meeting", validateParams(phaseParamSchema), async (req, res) => {
  const { phase } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const progress = await prisma.onboardingProgress.findUnique({
    where: { clientId_phase: { clientId: client.id, phase } },
  });
  if (!progress) throw new AppError(404, "PHASE_NOT_FOUND", "Phase not found");

  if (progress.status !== "IN_PROGRESS") {
    throw new AppError(400, "PHASE_NOT_ACTIVE", "This phase isn't active yet.");
  }

  if (phase === 1) {
    const [totalCategories, documents] = await Promise.all([
      prisma.documentCategory.count({ where: { phase: 1 } }),
      prisma.document.count({ where: { clientId: client.id } }),
    ]);
    if (documents < totalCategories) {
      throw new AppError(400, "DOCS_INCOMPLETE", "All document categories must be uploaded before scheduling.");
    }
  } else if (phase === 2) {
    const items = await getChecklistForPhase(client.id, 2);
    const readyItems = items.filter((i) => i.sortOrder <= 2);
    if (!readyItems.every((i) => i.completed)) {
      throw new AppError(400, "CHECKLIST_INCOMPLETE", "Download Currence and connect your bank accounts before scheduling.");
    }
  } else if (phase === 3) {
    const complete = await isPhaseChecklistComplete(client.id, phase);
    if (!complete) {
      throw new AppError(400, "CHECKLIST_INCOMPLETE", "All steps in this phase must be completed before scheduling.");
    }
  } else {
    throw new AppError(400, "INVALID_PHASE", "This phase doesn't have a schedule-meeting action.");
  }

  await prisma.$transaction([
    prisma.meeting.create({ data: { clientId: client.id, phase, status: "REQUESTED" } }),
    prisma.onboardingProgress.update({
      where: { clientId_phase: { clientId: client.id, phase } },
      data: { status: "COMPLETE", completedAt: new Date() },
    }),
  ]);

  res.ok({ ok: true });
});

clientRouter.get("/action-items", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const items = await prisma.actionItem.findMany({
    where: { clientId: client.id, completed: false },
    orderBy: { createdAt: "asc" },
  });

  res.ok({
    items: items.map((i) => ({ id: i.id, text: i.text, createdAt: i.createdAt })),
  });
});

clientRouter.post("/action-items/:id/complete", validateParams(z.object({ id: z.string().cuid() })), async (req, res) => {
  const { id } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const item = await prisma.actionItem.findFirst({
    where: { id, clientId: client.id },
  });
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Action item not found");

  await prisma.actionItem.update({
    where: { id: item.id },
    data: { completed: true, completedAt: new Date() },
  });

  res.created({ ok: true });
});

clientRouter.get("/messages", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const messages = await prisma.clientMessage.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "asc" },
  });

  res.ok({
    messages: messages.map((m) => ({ id: m.id, body: m.body, authorRole: m.authorRole, createdAt: m.createdAt })),
  });
});

clientRouter.post("/messages", validateBody(schemas.clientSendMessageSchema), async (req, res) => {
  const { body } = req.body;

  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.clientMessage.create({
      data: { clientId: client.id, authorUserId: req.session.userId!, authorRole: "CLIENT", body: body.trim() },
    });
    if (admins.length > 0) {
      await tx.adminNotification.createMany({
        data: admins.map((a) => ({ userId: a.id, clientId: client.id, messageId: created.id })),
      });
    }
    return created;
  });

  for (const admin of admins) {
    sendAdminMessageEmail(admin.email, client.householdLabel, message.body).catch(() => {
      logger.error("Failed to send admin message email", undefined, { adminEmail: admin.email });
    });
  }

  res.created({ ok: true });
});

clientRouter.get("/notifications", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const unreadOnly = req.query.unreadOnly === "true";
  const notifications = await prisma.clientNotification.findMany({
    where: {
      clientId: client.id,
      ...(unreadOnly && { readAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.clientNotification.count({
    where: { clientId: client.id, readAt: null },
  });

  res.ok({ notifications, unreadCount });
});

clientRouter.post("/notifications/:id/read", validateParams(notificationIdParamSchema), async (req, res) => {
  const { id } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const notification = await prisma.clientNotification.findFirst({
    where: { id, clientId: client.id },
  });
  if (!notification) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");

  await prisma.clientNotification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });

  res.ok({ ok: true });
});

clientRouter.post("/notifications/read-all", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  await prisma.clientNotification.updateMany({
    where: { clientId: client.id, readAt: null },
    data: { readAt: new Date() },
  });

  res.ok({ ok: true });
});

clientRouter.get("/preferences", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  let preferences = await prisma.notificationPreference.findUnique({
    where: { clientId: client.id },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: { clientId: client.id },
    });
  }

  res.ok(preferences);
});

clientRouter.post("/preferences", validateBody(schemas.updatePreferencesSchema), async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const preferences = await prisma.notificationPreference.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, ...req.body },
    update: req.body,
  });

  res.ok({ ok: true, preferences });
});

clientRouter.post("/password/change", validateBody(schemas.changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.session.userId! } });
  if (!user || !user.passwordHash) throw new AppError(401, "USER_NOT_FOUND", "User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_PASSWORD", "Current password is incorrect");

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  res.ok({ ok: true });
});

clientRouter.get("/policies", async (req, res) => {
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const policies = await prisma.policy.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
  });

  res.ok({ data: policies });
});

clientRouter.get("/policies/:policyId", validateParams(z.object({ policyId: z.string().cuid() })), async (req, res) => {
  const { policyId } = req.params;
  const client = await getOwnClient(req.session.userId!);
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client profile not found");

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
  });
  if (!policy) throw new AppError(404, "POLICY_NOT_FOUND", "Policy not found");
  if (policy.clientId !== client.id) throw new AppError(403, "FORBIDDEN", "Cannot access this policy");

  res.ok({ data: policy });
});
