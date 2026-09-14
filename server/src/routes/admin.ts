import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/auth";
import { AppError } from "../utils/appError";
import { validateBody, validateParams } from "../validation/validator";
import { z } from "zod";
import logger from "../utils/logger";
import { sendInviteEmail } from "../services/inviteEmail";
import {
  assertPriorItemsComplete,
  describeCurrentStep,
  getChecklistForPhase,
  getChecklistsForClients,
  phaseRequiresSequentialCompletion,
  uncompleteChecklistItemCascade,
} from "../services/checklist";
import { isValidHealthRating } from "../services/healthRating";
import * as schemas from "../validation/schemas";

export const adminRouter = Router();
adminRouter.use(requireRole("ADMIN"));

const INVITE_TTL_DAYS = 7;
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const idParamSchema = z.object({ id: z.string().cuid() });
const itemIdParamSchema = z.object({ id: z.string().cuid(), itemId: z.string().cuid() });
const categoryIdParamSchema = z.object({ id: z.string().cuid(), categoryId: z.string().cuid() });

adminRouter.post("/clients", validateBody(schemas.createClientSchema), async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "A user with this email already exists.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, role: "CLIENT", updatedAt: new Date() },
    });
    const client = await tx.client.create({
      data: { userId: user.id, firstName, lastName, phone, householdLabel: `${firstName} ${lastName}` },
    });
    await tx.onboardingProgress.createMany({
      data: [1, 2, 3, 4].map((phase) => ({
        clientId: client.id,
        phase,
        status: "IN_PROGRESS",
      })),
    });
    const token = crypto.randomBytes(32).toString("hex");
    const invite = await tx.inviteToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { user, client, invite };
  });

  sendInviteEmail(email, result.invite.token).catch(() => {
    logger.error("Failed to send invite email", undefined, { email });
  });

  res.created({ clientId: result.client.id });
});

adminRouter.get("/clients", async (req, res) => {
  const clients = await prisma.client.findMany({
    include: {
      user: { select: { email: true } },
      progress: true,
      documents: true,
      missingDocumentFlags: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCategories = await prisma.documentCategory.count({ where: { phase: 1 } });
  const clientIds = clients.map((c) => c.id);
  const [phase2Map, phase3Map, unreadCounts] = await Promise.all([
    getChecklistsForClients(clientIds, 2),
    getChecklistsForClients(clientIds, 3),
    prisma.adminNotification.groupBy({
      by: ["clientId"],
      where: { userId: req.session.userId!, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const unreadByClientId = new Map(unreadCounts.map((u) => [u.clientId, u._count._all]));

  const shaped = clients.map((c) => {
    const sortedProgress = [...c.progress].sort((a, b) => a.phase - b.phase);
    const currentPhase =
      sortedProgress.find((p) => p.status === "IN_PROGRESS")?.phase ??
      sortedProgress.filter((p) => p.status === "COMPLETE").length ??
      1;
    const currentPhaseStatus = c.progress.find((p) => p.phase === currentPhase)?.status ?? "LOCKED";
    const phase1UploadedCategories = new Set(c.documents.map((d) => d.categoryId)).size;

    const currentStepLabel = describeCurrentStep(currentPhase, currentPhaseStatus, {
      phase1: { uploaded: phase1UploadedCategories, total: totalCategories },
      phase2Items: phase2Map.get(c.id),
      phase3Items: phase3Map.get(c.id),
      legacyHandoffCompletedAt: c.legacyHandoffCompletedAt,
    });

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.user.email,
      healthRating: c.healthRating,
      currentPhase,
      currentStepLabel,
      phase1Progress: { uploaded: phase1UploadedCategories, total: totalCategories },
      phase1MissingCount: c.missingDocumentFlags.length,
      unreadMessageCount: unreadByClientId.get(c.id) ?? 0,
      phaseStatuses: c.progress
        .sort((a, b) => a.phase - b.phase)
        .map((p) => ({ phase: p.phase, status: p.status })),
    };
  });

  res.ok(shaped);
});

adminRouter.get("/clients/:id", validateParams(idParamSchema), async (req, res) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const [progress, categories, documents, missingFlags, phase2Checklist, phase3Checklist, actionItems, messages] =
    await Promise.all([
      prisma.onboardingProgress.findMany({ where: { clientId: client.id }, orderBy: { phase: "asc" } }),
      prisma.documentCategory.findMany({ where: { phase: 1 }, orderBy: { sortOrder: "asc" } }),
      prisma.document.findMany({ where: { clientId: client.id } }),
      prisma.missingDocumentFlag.findMany({ where: { clientId: client.id } }),
      getChecklistForPhase(client.id, 2),
      getChecklistForPhase(client.id, 3),
      prisma.actionItem.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "desc" } }),
      prisma.clientMessage.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "asc" } }),
    ]);

  const uploadedByCategory = new Map(documents.map((d) => [d.categoryId, d]));
  const missingByCategory = new Set(missingFlags.map((f) => f.categoryId));

  res.ok({
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.user.email,
      phone: client.phone,
      householdLabel: client.householdLabel,
      healthRating: client.healthRating,
      legacyHandoffCompletedAt: client.legacyHandoffCompletedAt,
      passwordSet: !!client.user.passwordHash,
    },
    progress,
    phase1Categories: categories.map((cat) => ({
      id: cat.id,
      key: cat.key,
      label: cat.label,
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
    actionItems: actionItems.map((i) => ({
      id: i.id,
      text: i.text,
      completed: i.completed,
      completedAt: i.completedAt,
      createdAt: i.createdAt,
    })),
    messages: messages.map((m) => ({ id: m.id, body: m.body, authorRole: m.authorRole, createdAt: m.createdAt })),
  });
});

adminRouter.post("/clients/:id/resend-invite", validateParams(idParamSchema), async (req, res) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!client) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }

  if (client.user.passwordHash) {
    throw new AppError(400, "PASSWORD_ALREADY_SET", "This client has already set a password");
  }

  // Create a new invite token
  const token = crypto.randomBytes(32).toString("hex");
  const INVITE_TTL_DAYS = 7;

  await prisma.inviteToken.create({
    data: {
      userId: client.userId,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  // Send email
  sendInviteEmail(client.user.email, token).catch(() => {
    logger.error("Failed to send resend invite email", undefined, { email: client.user.email });
  });

  logger.info(`Resend invite email sent to ${client.user.email}`);

  res.ok({ ok: true, message: "Invitation email resent successfully" });
});

adminRouter.delete("/clients/:id", validateParams(idParamSchema), validateBody(schemas.deleteClientSchema), async (req, res) => {
  const { id } = req.params;
  const { confirmName } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const fullName = `${client.firstName} ${client.lastName}`;
  if (confirmName.trim().toLowerCase() !== fullName.toLowerCase()) {
    throw new AppError(400, "NAME_MISMATCH", "Typed name does not match this client's name.");
  }

  const documents = await prisma.document.findMany({ where: { clientId: client.id } });

  await prisma.$transaction([
    prisma.adminNotification.deleteMany({ where: { clientId: client.id } }),
    prisma.clientMessage.deleteMany({ where: { clientId: client.id } }),
    prisma.actionItem.deleteMany({ where: { clientId: client.id } }),
    prisma.checklistCompletion.deleteMany({ where: { clientId: client.id } }),
    prisma.missingDocumentFlag.deleteMany({ where: { clientId: client.id } }),
    prisma.document.deleteMany({ where: { clientId: client.id } }),
    prisma.meeting.deleteMany({ where: { clientId: client.id } }),
    prisma.onboardingProgress.deleteMany({ where: { clientId: client.id } }),
    prisma.clientNotification.deleteMany({ where: { clientId: client.id } }),
    prisma.notificationPreference.deleteMany({ where: { clientId: client.id } }),
    prisma.client.delete({ where: { id: client.id } }),
    prisma.inviteToken.deleteMany({ where: { userId: client.userId } }),
    prisma.user.delete({ where: { id: client.userId } }),
  ]);

  for (const doc of documents) {
    fs.unlink(doc.storedPath, () => {});
  }

  res.ok({ ok: true });
});

adminRouter.post(
  "/clients/:id/documents/:categoryId",
  validateParams(categoryIdParamSchema),
  upload.single("file"),
  async (req, res) => {
    const { id, categoryId } = req.params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
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

    try {
      await prisma.clientNotification.create({
        data: {
          clientId: client.id,
          type: "document",
          title: "Document Uploaded",
          body: `${category.label} has been uploaded by admin`,
          relatedId: category.id,
        },
      });
    } catch (err) {
      logger.error("Failed to create notification", err as Error, { clientId: client.id, type: "document" });
    }

    res.created({ ok: true });
  }
);

adminRouter.delete(
  "/clients/:id/documents/:categoryId",
  validateParams(categoryIdParamSchema),
  async (req, res) => {
    const { id, categoryId } = req.params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

    const existing = await prisma.document.findFirst({
      where: { clientId: client.id, categoryId },
    });
    if (!existing) throw new AppError(404, "DOCUMENT_NOT_FOUND", "No document uploaded for this category");

    await prisma.document.delete({ where: { id: existing.id } });
    fs.unlink(existing.storedPath, () => {});

    res.ok({ ok: true });
  }
);

adminRouter.post("/clients/:id/checklist/:itemId/complete", validateParams(itemIdParamSchema), async (req, res) => {
  const { id, itemId } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Unknown checklist item");
  if (item.completedBy !== "ADMIN") {
    throw new AppError(403, "NOT_ADMIN_ITEM", "This step is completed by the client.");
  }

  const progress = await prisma.onboardingProgress.findUnique({
    where: { clientId_phase: { clientId: client.id, phase: item.phase } },
  });
  if (!progress || progress.status === "LOCKED") {
    throw new AppError(400, "PHASE_LOCKED", "This phase isn't active yet.");
  }

  try {
    if (phaseRequiresSequentialCompletion(item.phase)) {
      await assertPriorItemsComplete(client.id, item.phase, item.sortOrder);
    }
  } catch (err) {
    throw new AppError(400, "PRIOR_ITEMS_INCOMPLETE", err instanceof Error ? err.message : "Cannot complete this step yet.");
  }

  await prisma.checklistCompletion.upsert({
    where: { clientId_itemId: { clientId: client.id, itemId: item.id } },
    update: {},
    create: { clientId: client.id, itemId: item.id, completedByUserId: req.session.userId! },
  });

  res.created({ ok: true });
});

adminRouter.post("/clients/:id/checklist/:itemId/incomplete", validateParams(itemIdParamSchema), async (req, res) => {
  const { id, itemId } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Unknown checklist item");

  const progress = await prisma.onboardingProgress.findUnique({
    where: { clientId_phase: { clientId: client.id, phase: item.phase } },
  });
  if (!progress || progress.status === "LOCKED") {
    throw new AppError(400, "PHASE_LOCKED", "This phase isn't active yet.");
  }

  if (phaseRequiresSequentialCompletion(item.phase)) {
    await uncompleteChecklistItemCascade(client.id, item.phase, item.sortOrder);
  } else {
    await prisma.checklistCompletion.deleteMany({ where: { clientId: client.id, itemId: item.id } });
  }

  res.ok({ ok: true });
});

adminRouter.post("/clients/:id/health-rating", validateParams(idParamSchema), validateBody(schemas.setHealthRatingSchema), async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  await prisma.client.update({ where: { id: client.id }, data: { healthRating: rating } });
  res.ok({ ok: true });
});

adminRouter.post("/clients/:id/phase4/complete", validateParams(idParamSchema), async (req, res) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const progress = await prisma.onboardingProgress.findUnique({
    where: { clientId_phase: { clientId: client.id, phase: 4 } },
  });
  if (!progress || progress.status !== "IN_PROGRESS") {
    throw new AppError(400, "PHASE_NOT_ACTIVE", "Phase 4 isn't active yet.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.client.update({ where: { id: client.id }, data: { legacyHandoffCompletedAt: now } }),
    prisma.onboardingProgress.update({
      where: { clientId_phase: { clientId: client.id, phase: 4 } },
      data: { status: "COMPLETE", completedAt: now },
    }),
  ]);

  res.ok({ ok: true });
});

adminRouter.post("/clients/:id/action-items", validateParams(idParamSchema), validateBody(schemas.addActionItemSchema), async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const actionItem = await prisma.actionItem.create({
    data: { clientId: client.id, text: text.trim(), createdByUserId: req.session.userId! },
  });

  try {
    await prisma.clientNotification.create({
      data: {
        clientId: client.id,
        type: "action_item",
        title: "New Action Item",
        body: text.trim(),
        relatedId: actionItem.id,
      },
    });
  } catch (err) {
    logger.error("Failed to create notification", err as Error, { clientId: client.id, type: "action_item" });
  }

  res.created({ ok: true });
});

adminRouter.delete(
  "/clients/:id/action-items/:itemId",
  validateParams(z.object({ id: z.string().cuid(), itemId: z.string().cuid() })),
  async (req, res) => {
    const { id, itemId } = req.params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

    const item = await prisma.actionItem.findFirst({
      where: { id: itemId, clientId: client.id },
    });
    if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Action item not found");

    await prisma.actionItem.delete({ where: { id: item.id } });
    res.ok({ ok: true });
  }
);

adminRouter.post("/clients/:id/messages", validateParams(idParamSchema), validateBody(schemas.sendMessageSchema), async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const message = await prisma.clientMessage.create({
    data: { clientId: client.id, authorUserId: req.session.userId!, authorRole: "ADMIN", body: body.trim() },
  });

  const messagePreview = body.trim().substring(0, 100);
  try {
    await prisma.clientNotification.create({
      data: {
        clientId: client.id,
        type: "message",
        title: "Message from Admin",
        body: messagePreview,
        relatedId: message.id,
      },
    });
  } catch (err) {
    logger.error("Failed to create notification", err as Error, { clientId: client.id, type: "message" });
  }

  res.created({ ok: true });
});

adminRouter.post("/clients/:id/messages/read", validateParams(idParamSchema), async (req, res) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  await prisma.adminNotification.updateMany({
    where: { userId: req.session.userId!, clientId: client.id, readAt: null },
    data: { readAt: new Date() },
  });

  res.ok({ ok: true });
});

const clientIdParamSchema = z.object({ clientId: z.string().cuid() });
const policyIdParamSchema = z.object({ clientId: z.string().cuid(), policyId: z.string().cuid() });

adminRouter.get("/clients/:clientId/policies", validateParams(clientIdParamSchema), async (req, res) => {
  const { clientId } = req.params;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const policies = await prisma.policy.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  res.ok({ data: policies });
});

adminRouter.post("/clients/:clientId/policies", validateParams(clientIdParamSchema), validateBody(schemas.createPolicySchema), async (req, res) => {
  const { clientId } = req.params;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const policy = await prisma.policy.create({
    data: {
      ...req.body,
      clientId,
      issueDate: new Date(req.body.issueDate),
      expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : null,
    },
  });

  res.created({ data: policy });
});

adminRouter.put("/clients/:clientId/policies/:policyId", validateParams(policyIdParamSchema), validateBody(schemas.updatePolicySchema), async (req, res) => {
  const { clientId, policyId } = req.params;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) throw new AppError(404, "POLICY_NOT_FOUND", "Policy not found");
  if (policy.clientId !== clientId) throw new AppError(403, "FORBIDDEN", "Cannot modify this policy");

  const updated = await prisma.policy.update({
    where: { id: policyId },
    data: {
      ...req.body,
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
      expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : undefined,
    },
  });

  res.ok({ data: updated });
});

adminRouter.delete("/clients/:clientId/policies/:policyId", validateParams(policyIdParamSchema), async (req, res) => {
  const { clientId, policyId } = req.params;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) throw new AppError(404, "POLICY_NOT_FOUND", "Policy not found");
  if (policy.clientId !== clientId) throw new AppError(403, "FORBIDDEN", "Cannot delete this policy");

  await prisma.policy.delete({ where: { id: policyId } });
  res.ok({ ok: true });
});
