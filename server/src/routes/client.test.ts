import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockPrisma = vi.hoisted(() => ({
  client: { findUnique: vi.fn() },
  checklistItem: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  checklistCompletion: { findMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  onboardingProgress: { findUnique: vi.fn(), update: vi.fn() },
  documentCategory: { count: vi.fn() },
  document: { count: vi.fn() },
  meeting: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../services/adminMessageEmail", () => ({ sendAdminMessageEmail: vi.fn() }));

import { clientRouter } from "./client";

function buildApp(session: Record<string, unknown> = { userId: "user-1", role: "CLIENT" }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = session;
    next();
  });
  app.use("/client", clientRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.client.findUnique.mockResolvedValue({ id: "client-1", legacyHandoffCompletedAt: null });
});

describe("POST /client/checklist/:itemId/complete", () => {
  it("allows completing phase 2 steps out of order", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "fund_reservoir",
      phase: 2,
      sortOrder: 4,
      completedBy: "CLIENT",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistCompletion.upsert.mockResolvedValue({});

    const res = await request(buildApp()).post("/client/checklist/fund_reservoir/complete").send();

    expect(res.status).toBe(201);
    expect(mockPrisma.checklistCompletion.upsert).toHaveBeenCalled();
  });

  it("rejects completing a step owned by the advisor team", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "health_approval",
      phase: 3,
      sortOrder: 2,
      completedBy: "ADMIN",
    });

    const res = await request(buildApp()).post("/client/checklist/health_approval/complete").send();

    expect(res.status).toBe(403);
  });

  it("rejects acting on a phase that isn't active yet", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "application",
      phase: 3,
      sortOrder: 1,
      completedBy: "CLIENT",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "LOCKED" });

    const res = await request(buildApp()).post("/client/checklist/application/complete").send();

    expect(res.status).toBe(400);
  });

  it("404s when the checklist item doesn't exist", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).post("/client/checklist/unknown/complete").send();

    expect(res.status).toBe(404);
  });
});

describe("POST /client/checklist/:itemId/incomplete", () => {
  it("cascades un-completion through everything after the target step (phase 3)", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "application",
      phase: 3,
      sortOrder: 1,
      completedBy: "CLIENT",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "application", sortOrder: 1 },
      { id: "health_approval", sortOrder: 2 },
      { id: "underwriting", sortOrder: 3 },
    ]);

    const res = await request(buildApp()).post("/client/checklist/application/incomplete").send();

    expect(res.status).toBe(200);
    expect(mockPrisma.checklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { clientId: "client-1", itemId: { in: ["application", "health_approval", "underwriting"] } },
    });
  });

  it("only deletes the single item's completion for a non-sequential phase (phase 2)", async () => {
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "fund_reservoir",
      phase: 2,
      sortOrder: 4,
      completedBy: "CLIENT",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });

    const res = await request(buildApp()).post("/client/checklist/fund_reservoir/incomplete").send();

    expect(res.status).toBe(200);
    expect(mockPrisma.checklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { clientId: "client-1", itemId: "fund_reservoir" },
    });
  });
});

describe("POST /client/phases/:phase/schedule-meeting", () => {
  it("phase 1: blocks scheduling until every document category is uploaded", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.documentCategory.count.mockResolvedValue(11);
    mockPrisma.document.count.mockResolvedValue(9);

    const res = await request(buildApp()).post("/client/phases/1/schedule-meeting").send();

    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("phase 1: allows scheduling once all documents are uploaded", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.documentCategory.count.mockResolvedValue(11);
    mockPrisma.document.count.mockResolvedValue(11);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const res = await request(buildApp()).post("/client/phases/1/schedule-meeting").send();

    expect(res.status).toBe(200);
  });

  it("phase 2: only requires the first two steps, not all five", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "i1", key: "download", label: "Download Currence", sortOrder: 1 },
      { id: "i2", key: "connect", label: "Connect bank accounts", sortOrder: 2 },
      { id: "i3", key: "direct_deposit", label: "Set up direct deposit", sortOrder: 3 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ itemId: "i1" }, { itemId: "i2" }]);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const res = await request(buildApp()).post("/client/phases/2/schedule-meeting").send();

    expect(res.status).toBe(200);
  });

  it("phase 2: blocks scheduling when the first two steps aren't both done", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "i1", key: "download", label: "Download Currence", sortOrder: 1 },
      { id: "i2", key: "connect", label: "Connect bank accounts", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ itemId: "i1" }]);

    const res = await request(buildApp()).post("/client/phases/2/schedule-meeting").send();

    expect(res.status).toBe(400);
  });

  it("phase 3: requires every checklist item to be complete", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "i1", key: "application", label: "Application", sortOrder: 1 },
      { id: "i2", key: "health_approval", label: "Health Approval", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ itemId: "i1" }]);

    const res = await request(buildApp()).post("/client/phases/3/schedule-meeting").send();

    expect(res.status).toBe(400);
  });

  it("phase 4: has no schedule-meeting action", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });

    const res = await request(buildApp()).post("/client/phases/4/schedule-meeting").send();

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/doesn't have a schedule-meeting action/);
  });

  it("rejects scheduling on a phase that isn't active yet", async () => {
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "LOCKED" });

    const res = await request(buildApp()).post("/client/phases/3/schedule-meeting").send();

    expect(res.status).toBe(400);
  });
});
