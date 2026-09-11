import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    client: {
      onboarding: vi.fn(),
      actionItems: vi.fn().mockResolvedValue({ items: [] }),
      messages: vi.fn().mockResolvedValue({ messages: [] }),
    },
  },
}));

vi.mock("../components/PortalShell", () => ({
  PortalShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function baseOnboarding(overrides: Partial<any> = {}) {
  return {
    client: { id: "c1", firstName: "Order", householdLabel: "Order Test", healthRating: null, welcomeSeenAt: null },
    progress: [
      { phase: 1, status: "IN_PROGRESS" },
      { phase: 2, status: "LOCKED" },
      { phase: 3, status: "LOCKED" },
      { phase: 4, status: "LOCKED" },
    ],
    allPhasesComplete: false,
    currentPhase: 1,
    currentStepLabel: "0 of 11 documents",
    nextActionHint: null,
    phase1Categories: [],
    phase2Checklist: [],
    phase3Checklist: [],
    phase4: { legacyHandoffCompletedAt: null },
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (api.client.actionItems as any).mockResolvedValue({ items: [] });
  (api.client.messages as any).mockResolvedValue({ messages: [] });
});

describe("Dashboard onboarding card", () => {
  it("shows the 'not started' hint when nothing has been touched yet", async () => {
    (api.client.onboarding as any).mockResolvedValue(baseOnboarding());
    renderDashboard();

    expect(await screen.findByText(/Not started yet/)).toBeInTheDocument();
  });

  it("does not show the 'not started' hint once a phase has progress", async () => {
    (api.client.onboarding as any).mockResolvedValue(
      baseOnboarding({ phase1Categories: [{ id: "a", key: "a", label: "A", uploaded: true, missing: false, document: null }] })
    );
    renderDashboard();

    await screen.findByText("Phase 1");
    expect(screen.queryByText(/Not started yet/)).not.toBeInTheDocument();
  });

  it("only renders the carrier pipeline timeline for the phase 3 summary row", async () => {
    (api.client.onboarding as any).mockResolvedValue(
      baseOnboarding({
        progress: [
          { phase: 1, status: "COMPLETE" },
          { phase: 2, status: "COMPLETE" },
          { phase: 3, status: "IN_PROGRESS" },
          { phase: 4, status: "LOCKED" },
        ],
        currentPhase: 3,
        phase3Checklist: [
          { id: "application", key: "application", label: "Application", completedBy: "CLIENT", sortOrder: 1, completed: true, completedAt: null },
          { id: "health_approval", key: "health_approval", label: "Health Approval", completedBy: "ADMIN", sortOrder: 2, completed: false, completedAt: null },
        ],
      })
    );
    const { container } = renderDashboard();

    await screen.findByText("Phase 3");
    // The circle-and-timeline stepper (CarrierPipelineTimeline) renders one
    // [data-step-state] circle per step — its presence marks that phase 3's
    // row rendered the pipeline, which phases 1/2/4 never do.
    expect(container.querySelectorAll("[data-step-state]").length).toBeGreaterThan(0);
    expect(screen.queryByText("Phase 4")).not.toBeInTheDocument();
  });

  it("shows the onboarding-complete subtitle and hides phase rows once everything is done", async () => {
    (api.client.onboarding as any).mockResolvedValue(baseOnboarding({ allPhasesComplete: true }));
    renderDashboard();

    expect(await screen.findByText("Onboarding complete")).toBeInTheDocument();
    expect(screen.queryByText(/Phase \d/)).not.toBeInTheDocument();
  });
});
