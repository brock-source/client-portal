import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  describeCurrentStep,
  phaseRequiresSequentialCompletion,
  assertPriorItemsComplete,
  uncompleteChecklistItemCascade,
  getChecklistsForClients,
  isPhaseChecklistComplete,
} from "./checklist";

const mockPrisma = vi.hoisted(() => ({
  checklistItem: { findMany: vi.fn() },
  checklistCompletion: { findMany: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("../db/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("phaseRequiresSequentialCompletion", () => {
  it("is true only for phase 3", () => {
    expect(phaseRequiresSequentialCompletion(3)).toBe(true);
    expect(phaseRequiresSequentialCompletion(1)).toBe(false);
    expect(phaseRequiresSequentialCompletion(2)).toBe(false);
    expect(phaseRequiresSequentialCompletion(4)).toBe(false);
  });
});

describe("describeCurrentStep", () => {
  it("returns 'Not started' when the phase is locked", () => {
    expect(describeCurrentStep(2, "LOCKED", {})).toBe("Not started");
  });

  it("phase 1: reports uploaded/total counts while in progress", () => {
    expect(describeCurrentStep(1, "IN_PROGRESS", { phase1: { uploaded: 3, total: 11 } })).toBe("3 of 11 documents");
  });

  it("phase 1: reports complete once done", () => {
    expect(describeCurrentStep(1, "COMPLETE", { phase1: { uploaded: 11, total: 11 } })).toBe("Documents complete");
  });

  it("phase 2: reports completed step count while in progress", () => {
    const items = [mkItem("a", 1, true), mkItem("b", 2, false), mkItem("c", 3, false)];
    expect(describeCurrentStep(2, "IN_PROGRESS", { phase2Items: items })).toBe("1 of 3 steps");
  });

  it("phase 2: reports complete once done", () => {
    expect(describeCurrentStep(2, "COMPLETE", { phase2Items: [] })).toBe("Cash flow complete");
  });

  it("phase 3: reports 'Application pending' before the application step is done", () => {
    const items = [mkItem("application", 1, false), mkItem("health_approval", 2, false)];
    expect(describeCurrentStep(3, "IN_PROGRESS", { phase3Items: items })).toBe("Application pending");
  });

  it("phase 3: reports the label of the next incomplete step after the application", () => {
    const items = [
      mkItem("application", 1, true, "Application"),
      mkItem("health_approval", 2, false, "Health Approval"),
      mkItem("underwriting", 3, false, "Underwriting"),
    ];
    expect(describeCurrentStep(3, "IN_PROGRESS", { phase3Items: items })).toBe("Health Approval");
  });

  it("phase 3: reports 'Awaiting meeting' once every step but the application is done", () => {
    const items = [
      mkItem("application", 1, true, "Application"),
      mkItem("health_approval", 2, true, "Health Approval"),
      mkItem("closing_docs", 3, true, "Closing Docs"),
    ];
    expect(describeCurrentStep(3, "IN_PROGRESS", { phase3Items: items })).toBe("Awaiting meeting");
  });

  it("phase 3: reports complete once done", () => {
    expect(describeCurrentStep(3, "COMPLETE", { phase3Items: [] })).toBe("Turbocharger complete");
  });

  it("phase 4: reports awaiting handoff until completed", () => {
    expect(describeCurrentStep(4, "IN_PROGRESS", { legacyHandoffCompletedAt: null })).toBe("Awaiting handoff");
  });

  it("phase 4: reports handoff complete once a completion date is set", () => {
    expect(describeCurrentStep(4, "IN_PROGRESS", { legacyHandoffCompletedAt: new Date("2026-01-01") })).toBe(
      "Handoff complete"
    );
  });
});

describe("assertPriorItemsComplete", () => {
  it("throws naming the first incomplete earlier step", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "1", key: "application", label: "Application", completedBy: "CLIENT", sortOrder: 1 },
      { id: "2", key: "health_approval", label: "Health Approval", completedBy: "ADMIN", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([]);

    await expect(assertPriorItemsComplete("client-1", 3, 2)).rejects.toThrow('"Application" must be completed first.');
  });

  it("resolves when every earlier step is already complete", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "1", key: "application", label: "Application", completedBy: "CLIENT", sortOrder: 1 },
      { id: "2", key: "health_approval", label: "Health Approval", completedBy: "ADMIN", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([
      { itemId: "1", completedAt: new Date() },
    ]);

    await expect(assertPriorItemsComplete("client-1", 3, 2)).resolves.toBeUndefined();
  });
});

describe("uncompleteChecklistItemCascade", () => {
  it("deletes completions for the target item and everything after it, not earlier items", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "2", sortOrder: 2 },
      { id: "3", sortOrder: 3 },
    ]);
    mockPrisma.checklistCompletion.deleteMany.mockResolvedValue({ count: 2 });

    await uncompleteChecklistItemCascade("client-1", 3, 2);

    expect(mockPrisma.checklistItem.findMany).toHaveBeenCalledWith({
      where: { phase: 3, sortOrder: { gte: 2 } },
    });
    expect(mockPrisma.checklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { clientId: "client-1", itemId: { in: ["2", "3"] } },
    });
  });
});

describe("getChecklistsForClients", () => {
  it("batches completions per client without leaking across clients", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "i1", key: "a", label: "A", sortOrder: 1 },
      { id: "i2", key: "b", label: "B", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ clientId: "client-1", itemId: "i1" }]);

    const result = await getChecklistsForClients(["client-1", "client-2"], 2);

    expect(result.get("client-1")!.map((i) => i.completed)).toEqual([true, false]);
    expect(result.get("client-2")!.map((i) => i.completed)).toEqual([false, false]);
  });

  it("returns an all-incomplete list for a client with zero completions", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([{ id: "i1", key: "a", label: "A", sortOrder: 1 }]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([]);

    const result = await getChecklistsForClients(["client-9"], 2);

    expect(result.get("client-9")).toEqual([{ id: "i1", key: "a", label: "A", sortOrder: 1, completed: false }]);
  });
});

describe("isPhaseChecklistComplete", () => {
  it("is false when the phase has no items", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([]);
    expect(await isPhaseChecklistComplete("client-1", 3)).toBe(false);
  });

  it("is true only once every item is completed", async () => {
    mockPrisma.checklistItem.findMany.mockResolvedValue([
      { id: "i1", key: "a", label: "A", completedBy: "CLIENT", sortOrder: 1 },
      { id: "i2", key: "b", label: "B", completedBy: "ADMIN", sortOrder: 2 },
    ]);
    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ itemId: "i1" }]);
    expect(await isPhaseChecklistComplete("client-1", 3)).toBe(false);

    mockPrisma.checklistCompletion.findMany.mockResolvedValue([{ itemId: "i1" }, { itemId: "i2" }]);
    expect(await isPhaseChecklistComplete("client-1", 3)).toBe(true);
  });
});

function mkItem(key: string, sortOrder: number, completed: boolean, label = key) {
  return { id: key, key, label, sortOrder, completed };
}
