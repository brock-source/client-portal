import React from "react";
import { ChecklistItem } from "../api/client";

/**
 * The Phase 3 "Complete your life insurance application" step is excluded — this only
 * visualizes the carrier-side stages that follow it, with a cosmetic leading "Processing"
 * tile representing "nothing in the pipeline has moved yet" (see ClientJourney's Phase3Panel).
 */
export function getCarrierPipelineDisplay(items: ChecklistItem[]) {
  const realPipelineSteps = items.filter((i) => i.key !== "application");
  return [
    { key: "processing", label: "Processing", completed: realPipelineSteps.some((s) => s.completed) },
    ...realPipelineSteps.map((s) => ({ key: s.key, label: s.label, completed: s.completed })),
  ];
}

export function CarrierPipeline({ items }: { items: ChecklistItem[] }) {
  const pipelineDisplay = getCarrierPipelineDisplay(items);
  const currentStep = pipelineDisplay.find((s) => !s.completed);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {pipelineDisplay.map((step) => {
        const isCurrent = step.key === currentStep?.key;
        return (
          <div
            key={step.key}
            style={{
              flex: "1 1 90px",
              textAlign: "center",
              padding: "12px 8px",
              borderRadius: "var(--radius-md)",
              border: isCurrent ? "1px solid var(--gold-600)" : "1px solid var(--border-subtle)",
              background: step.completed ? "var(--navy-700)" : isCurrent ? "var(--paper-alt)" : "#fff",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: step.completed ? "#fff" : isCurrent ? "var(--gold-700)" : "var(--stone-500)",
              }}
            >
              {step.completed ? "✓ " : ""}
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
