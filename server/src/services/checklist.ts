import { prisma } from "../db/prisma";

export async function getChecklistForPhase(clientId: string, phase: number) {
  const [items, completions] = await Promise.all([
    prisma.checklistItem.findMany({ where: { phase }, orderBy: { sortOrder: "asc" } }),
    prisma.checklistCompletion.findMany({ where: { clientId, item: { phase } } }),
  ]);
  const completedByItemId = new Map(completions.map((c) => [c.itemId, c]));
  return items.map((item) => ({
    id: item.id,
    key: item.key,
    label: item.label,
    completedBy: item.completedBy,
    sortOrder: item.sortOrder,
    completed: completedByItemId.has(item.id),
    completedAt: completedByItemId.get(item.id)?.completedAt ?? null,
  }));
}

export async function isPhaseChecklistComplete(clientId: string, phase: number) {
  const checklist = await getChecklistForPhase(clientId, phase);
  return checklist.length > 0 && checklist.every((item) => item.completed);
}

/**
 * Only Phase 3 (the carrier underwriting pipeline) has a real-world required order.
 * Phase 2's cash-flow checklist can be completed in any order — only the first two
 * items (Currence download + bank connection) gate scheduling the activation meeting.
 */
const SEQUENTIAL_PHASES = new Set([3]);
export function phaseRequiresSequentialCompletion(phase: number) {
  return SEQUENTIAL_PHASES.has(phase);
}

/**
 * Enforces that checklist items within a phase complete in sortOrder,
 * matching the real-world sequencing of an underwriting pipeline.
 */
export async function assertPriorItemsComplete(clientId: string, phase: number, sortOrder: number) {
  const checklist = await getChecklistForPhase(clientId, phase);
  const blocking = checklist.find((item) => item.sortOrder < sortOrder && !item.completed);
  if (blocking) {
    throw new Error(`"${blocking.label}" must be completed first.`);
  }
}

/**
 * Un-completing an item also un-completes anything after it in the same phase,
 * so the "completed prefix" invariant sequential completion relies on still holds.
 */
export async function uncompleteChecklistItemCascade(clientId: string, phase: number, sortOrder: number) {
  const itemsFromHere = await prisma.checklistItem.findMany({
    where: { phase, sortOrder: { gte: sortOrder } },
  });
  await prisma.checklistCompletion.deleteMany({
    where: { clientId, itemId: { in: itemsFromHere.map((i) => i.id) } },
  });
}

export interface ChecklistItemState {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  completed: boolean;
}

/** Same shape as getChecklistForPhase, batched across many clients to avoid N+1 queries in list views. */
export async function getChecklistsForClients(clientIds: string[], phase: number) {
  const [items, completions] = await Promise.all([
    prisma.checklistItem.findMany({ where: { phase }, orderBy: { sortOrder: "asc" } }),
    prisma.checklistCompletion.findMany({ where: { clientId: { in: clientIds }, item: { phase } } }),
  ]);

  const completedItemIdsByClient = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!completedItemIdsByClient.has(c.clientId)) completedItemIdsByClient.set(c.clientId, new Set());
    completedItemIdsByClient.get(c.clientId)!.add(c.itemId);
  }

  const result = new Map<string, ChecklistItemState[]>();
  for (const clientId of clientIds) {
    const completedIds = completedItemIdsByClient.get(clientId) ?? new Set<string>();
    result.set(
      clientId,
      items.map((item) => ({
        id: item.id,
        key: item.key,
        label: item.label,
        sortOrder: item.sortOrder,
        completed: completedIds.has(item.id),
      }))
    );
  }
  return result;
}

/** A short, human-readable description of exactly where a client is within their current phase. */
export function describeCurrentStep(
  phase: number,
  status: string,
  ctx: {
    phase1?: { uploaded: number; total: number };
    phase2Items?: ChecklistItemState[];
    phase3Items?: ChecklistItemState[];
    legacyHandoffCompletedAt?: Date | null;
  }
): string {
  if (status === "LOCKED") return "Not started";

  if (phase === 1) {
    const p1 = ctx.phase1 ?? { uploaded: 0, total: 0 };
    if (status === "COMPLETE") return "Documents complete";
    return `${p1.uploaded} of ${p1.total} documents`;
  }

  if (phase === 2) {
    const items = ctx.phase2Items ?? [];
    if (status === "COMPLETE") return "Cash flow complete";
    const completed = items.filter((i) => i.completed).length;
    return `${completed} of ${items.length} steps`;
  }

  if (phase === 3) {
    const items = ctx.phase3Items ?? [];
    if (status === "COMPLETE") return "Turbocharger complete";
    const application = items.find((i) => i.key === "application");
    if (!application?.completed) return "Application pending";
    const next = items.find((i) => i.key !== "application" && !i.completed);
    if (!next) return "Awaiting meeting";
    return next.label;
  }

  if (phase === 4) {
    if (ctx.legacyHandoffCompletedAt) return "Handoff complete";
    return "Awaiting handoff";
  }

  return "";
}
