import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarrierPipeline, getCarrierPipelineDisplay } from "./CarrierPipeline";
import { ChecklistItem } from "../api/client";

function mkItem(key: string, label: string, completed: boolean): ChecklistItem {
  return { id: key, key, label, completedBy: "ADMIN", sortOrder: 0, completed, completedAt: null };
}

describe("getCarrierPipelineDisplay", () => {
  it("filters out the 'application' step and prepends a synthetic 'Processing' step", () => {
    const items = [mkItem("application", "Application", true), mkItem("health_approval", "Health Approval", false)];
    const display = getCarrierPipelineDisplay(items);

    expect(display.map((s) => s.key)).toEqual(["processing", "health_approval"]);
  });

  it("marks 'Processing' complete once any real step is complete", () => {
    const items = [
      mkItem("application", "Application", true),
      mkItem("health_approval", "Health Approval", true),
      mkItem("underwriting", "Underwriting", false),
    ];
    const display = getCarrierPipelineDisplay(items);

    expect(display.find((s) => s.key === "processing")!.completed).toBe(true);
  });

  it("marks 'Processing' incomplete when no real step has started", () => {
    const items = [mkItem("application", "Application", true), mkItem("health_approval", "Health Approval", false)];
    const display = getCarrierPipelineDisplay(items);

    expect(display.find((s) => s.key === "processing")!.completed).toBe(false);
  });

  it("passes through real step labels and completion untouched", () => {
    const items = [mkItem("application", "Application", true), mkItem("underwriting", "Underwriting", true)];
    const display = getCarrierPipelineDisplay(items);

    expect(display.find((s) => s.key === "underwriting")).toEqual({
      key: "underwriting",
      label: "Underwriting",
      completed: true,
    });
  });
});

describe("CarrierPipeline", () => {
  it("shows a checkmark only for completed steps", () => {
    const items = [
      mkItem("application", "Application", true),
      mkItem("health_approval", "Health Approval", true),
      mkItem("underwriting", "Underwriting", false),
    ];
    render(<CarrierPipeline items={items} />);

    expect(screen.getByText(/✓\s*Processing/)).toBeInTheDocument();
    expect(screen.getByText(/✓\s*Health Approval/)).toBeInTheDocument();
    expect(screen.getByText("Underwriting")).toBeInTheDocument();
    expect(screen.queryByText(/✓\s*Underwriting/)).not.toBeInTheDocument();
  });

  it("renders every pipeline step's label exactly once", () => {
    const items = [
      mkItem("application", "Application", false),
      mkItem("health_approval", "Health Approval", false),
      mkItem("underwriting", "Underwriting", false),
      mkItem("approval", "Approval", false),
      mkItem("closing_docs", "Closing Docs", false),
    ];
    render(<CarrierPipeline items={items} />);

    for (const label of ["Processing", "Health Approval", "Underwriting", "Approval", "Closing Docs"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
