import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarrierPipelineTimeline } from "./CarrierPipelineTimeline";
import { ChecklistItem } from "../api/client";

function mkItem(key: string, label: string, completed: boolean): ChecklistItem {
  return { id: key, key, label, completedBy: "ADMIN", sortOrder: 0, completed, completedAt: null };
}

function circleFor(label: string) {
  const labelDiv = screen.getByText(label);
  const column = labelDiv.parentElement!;
  return column.querySelector("[data-step-state]")!;
}

describe("CarrierPipelineTimeline", () => {
  it("marks the first incomplete step as current, everything before it as completed", () => {
    const items = [
      mkItem("application", "Application", true),
      mkItem("health_approval", "Health Approval", true),
      mkItem("underwriting", "Underwriting", false),
    ];
    render(<CarrierPipelineTimeline items={items} />);

    expect(circleFor("Processing")).toHaveAttribute("data-step-state", "completed");
    expect(circleFor("Health Approval")).toHaveAttribute("data-step-state", "completed");
    expect(circleFor("Underwriting")).toHaveAttribute("data-step-state", "current");
  });

  it("shows 'Processing' as current when nothing has started yet", () => {
    const items = [mkItem("application", "Application", false), mkItem("health_approval", "Health Approval", false)];
    render(<CarrierPipelineTimeline items={items} />);

    expect(circleFor("Processing")).toHaveAttribute("data-step-state", "current");
    expect(circleFor("Health Approval")).toHaveAttribute("data-step-state", "upcoming");
  });

  it("marks every step completed, with no current step, once the pipeline is done", () => {
    const items = [
      mkItem("application", "Application", true),
      mkItem("health_approval", "Health Approval", true),
      mkItem("closing_docs", "Closing Docs", true),
    ];
    render(<CarrierPipelineTimeline items={items} />);

    expect(circleFor("Processing")).toHaveAttribute("data-step-state", "completed");
    expect(circleFor("Closing Docs")).toHaveAttribute("data-step-state", "completed");
    expect(screen.queryByText(/^current$/)).not.toBeInTheDocument();
  });

  it("renders a checkmark only inside completed circles", () => {
    const items = [
      mkItem("application", "Application", true),
      mkItem("health_approval", "Health Approval", true),
      mkItem("underwriting", "Underwriting", false),
    ];
    render(<CarrierPipelineTimeline items={items} />);

    expect(circleFor("Processing").textContent).toContain("✓");
    expect(circleFor("Health Approval").textContent).toContain("✓");
    expect(circleFor("Underwriting").textContent).not.toContain("✓");
  });
});
