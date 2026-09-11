import React from "react";
import { ChecklistItem } from "../api/client";
import { getCarrierPipelineDisplay } from "./CarrierPipeline";

/**
 * A minimal circle-and-line stepper, used only on the client Dashboard's compact
 * Onboarding card. The full onboarding page keeps the boxier `CarrierPipeline` tiles.
 */
export function CarrierPipelineTimeline({ items }: { items: ChecklistItem[] }) {
  const steps = getCarrierPipelineDisplay(items);
  const currentIndex = steps.findIndex((s) => !s.completed);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {steps.map((step, i) => {
        const isCurrent = i === currentIndex;
        const circleColor = step.completed ? "var(--navy-700)" : isCurrent ? "var(--gold-600)" : "var(--border-subtle)";
        const labelColor = step.completed ? "var(--navy-700)" : isCurrent ? "var(--gold-700)" : "var(--stone-500)";

        return (
          <React.Fragment key={step.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 22 }}>
              <div
                data-step-state={step.completed ? "completed" : isCurrent ? "current" : "upcoming"}
                style={{
                  width: 20,
                  height: 20,
                  flex: "none",
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  background: step.completed ? "var(--navy-700)" : isCurrent ? "var(--paper-alt)" : "#fff",
                  border: `2px solid ${circleColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.completed && (
                  <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }} aria-hidden>
                    ✓
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--font-label)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  color: labelColor,
                  lineHeight: 1.3,
                }}
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: "1 1 auto",
                  height: 2,
                  marginTop: 9,
                  background: step.completed ? "var(--navy-700)" : "var(--stone-200)",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
