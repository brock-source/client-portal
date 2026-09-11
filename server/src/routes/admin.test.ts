import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), delete: vi.fn() },
  client: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  checklistItem: { findUnique: vi.fn(), findMany: vi.fn() },
  checklistCompletion: { findMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  onboardingProgress: { findUnique: vi.fn(), deleteMany: vi.fn() },
  document: { findMany: vi.fn(), deleteMany: vi.fn() },
  adminNotification: { deleteMany: vi.fn() },
  clientMessage: { deleteMany: vi.fn() },
  actionItem: { deleteMany: vi.fn() },
  missingDocumentFlag: { deleteMany: vi.fn() },
  meeting: { deleteMany: vi.fn() },
  inviteToken: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../services/inviteEmail", () => ({ sendInviteEmail: vi.fn() }));

import { adminRouter } from "./admin";

function buildApp(session: Record<string, unknown> = { userId: "admin-1", role: "ADMIN" }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = session;
    next();
  });
  app.use("/admin", adminRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /admin/clients/:id/health-rating", () => {
  it("rejects a value outside the approved list", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });

    const res = await request(buildApp())
      .post("/admin/clients/c1/health-rating")
      .send({ rating: "Plus Plus" });

    expect(res.status).toBe(400);
    expect(mockPrisma.client.update).not.toHaveBeenCalled();
  });

  it("rejects a missing rating", async () => {
    const res = await request(buildApp()).post("/admin/clients/c1/health-rating").send({});
    expect(res.status).toBe(400);
  });

  it("404s for an unknown client", async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/admin/clients/unknown/health-rating")
      .send({ rating: "Preferred Plus" });

    expect(res.status).toBe(404);
  });

  it.each(["Preferred Plus", "Preferred", "Select", "Standard", "Preferred Tobacco", "Standard Tobacco"])(
    "accepts and persists the option %s",
    async (rating) => {
      mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.client.update.mockResolvedValue({});

      const res = await request(buildApp()).post("/admin/clients/c1/health-rating").send({ rating });

      expect(res.status).toBe(200);
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { healthRating: rating },
      });
    }
  );

  it("rejects the request entirely for a non-admin session", async () => {
    const res = await request(buildApp({ userId: "u1", role: "CLIENT" }))
      .post("/admin/clients/c1/health-rating")
      .send({ rating: "Preferred" });

    expect(res.status).toBe(403);
  });
});

describe("POST /admin/clients", () => {
  it("rejects when required fields are missing", async () => {
    const res = await request(buildApp()).post("/admin/clients").send({ firstName: "A" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when a user with that email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    const res = await request(buildApp())
      .post("/admin/clients")
      .send({ firstName: "New", lastName: "Client", email: "existing@example.com" });

    expect(res.status).toBe(409);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates the client and returns its id on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue({ id: "user-1" }) },
        client: { create: vi.fn().mockResolvedValue({ id: "client-1" }) },
        onboardingProgress: { createMany: vi.fn().mockResolvedValue({ count: 4 }) },
        inviteToken: { create: vi.fn().mockResolvedValue({ token: "abc123" }) },
      };
      return cb(tx);
    });

    const res = await request(buildApp())
      .post("/admin/clients")
      .send({ firstName: "New", lastName: "Client", email: "new@example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ clientId: "client-1" });
  });
});

describe("POST /admin/clients/:id/checklist/:itemId/complete", () => {
  it("blocks completing a step out of order, naming the blocking step", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "health_approval",
      phase: 3,
      sortOrder: 2,
      completedBy: "ADMIN",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "application", key: "application", label: "Application", completedBy: "CLIENT", sortOrder: 1 },
      { id: "health_approval", key: "health_approval", label: "Health Approval", completedBy: "ADMIN", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([]);

    const res = await request(buildApp())
      .post("/admin/clients/c1/checklist/health_approval/complete")
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Application");
    expect(mockPrisma.checklistCompletion.upsert).not.toHaveBeenCalled();
  });

  it("rejects completing a step that the client (not the admin) owns", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "application",
      phase: 3,
      sortOrder: 1,
      completedBy: "CLIENT",
    });

    const res = await request(buildApp()).post("/admin/clients/c1/checklist/application/complete").send();

    expect(res.status).toBe(403);
  });

  it("rejects acting on a locked phase", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "health_approval",
      phase: 3,
      sortOrder: 2,
      completedBy: "ADMIN",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "LOCKED" });

    const res = await request(buildApp()).post("/admin/clients/c1/checklist/health_approval/complete").send();

    expect(res.status).toBe(400);
  });
});

describe("POST /admin/clients/:id/checklist/:itemId/incomplete", () => {
  it("cascades: un-completing a step also removes completions for everything after it", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1" });
    mockPrisma.checklistItem.findUnique.mockResolvedValue({
      id: "health_approval",
      phase: 3,
      sortOrder: 2,
      completedBy: "ADMIN",
    });
    mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "health_approval", sortOrder: 2 },
      { id: "underwriting", sortOrder: 3 },
    ]);

    const res = await request(buildApp()).post("/admin/clients/c1/checklist/health_approval/incomplete").send();

    expect(res.status).toBe(200);
    expect(mockPrisma.checklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { clientId: "c1", itemId: { in: ["health_approval", "underwriting"] } },
    });
  });
});

describe("DELETE /admin/clients/:id", () => {
  it("404s for an unknown client", async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .delete("/admin/clients/unknown")
      .send({ confirmName: "Anyone" });

    expect(res.status).toBe(404);
  });

  it("rejects when the typed name doesn't match the client's full name", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1", firstName: "Order", lastName: "Test", userId: "u1" });

    const res = await request(buildApp())
      .delete("/admin/clients/c1")
      .send({ confirmName: "Order Tes" });

    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing confirmName", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1", firstName: "Order", lastName: "Test", userId: "u1" });

    const res = await request(buildApp()).delete("/admin/clients/c1").send({});

    expect(res.status).toBe(400);
  });

  it("accepts the name regardless of letter casing", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1", firstName: "Order", lastName: "Test", userId: "u1" });
    mockPrisma.document.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockResolvedValue([]);

    const res = await request(buildApp())
      .delete("/admin/clients/c1")
      .send({ confirmName: "order test" });

    expect(res.status).toBe(200);
  });

  it("cascades the delete across every related table, then the client and user, when the name matches exactly", async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: "c1", firstName: "Order", lastName: "Test", userId: "u1" });
    mockPrisma.document.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockResolvedValue([]);

    const res = await request(buildApp())
      .delete("/admin/clients/c1")
      .send({ confirmName: "Order Test" });

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.adminNotification.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.clientMessage.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.actionItem.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.checklistCompletion.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.missingDocumentFlag.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.document.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.meeting.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.onboardingProgress.deleteMany).toHaveBeenCalledWith({ where: { clientId: "c1" } });
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(mockPrisma.inviteToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("rejects the request entirely for a non-admin session", async () => {
    const res = await request(buildApp({ userId: "u1", role: "CLIENT" }))
      .delete("/admin/clients/c1")
      .send({ confirmName: "Order Test" });

    expect(res.status).toBe(403);
  });
});
