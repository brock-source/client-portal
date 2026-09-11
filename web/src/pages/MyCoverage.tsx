import { useEffect, useState } from "react";
import { PortalShell } from "../components/PortalShell";
import { api, Policy } from "../api/client";

const POLICY_TYPE_LABELS: Record<Policy["policyType"], string> = {
  LIFE: "Life Insurance",
  DISABILITY: "Disability Insurance",
  LONG_TERM_CARE: "Long-Term Care",
  UMBRELLA: "Umbrella Policy",
  HEALTH: "Health Insurance",
  OTHER: "Other",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const STATUS_COLORS: Record<Policy["status"], string> = {
  ACTIVE: "var(--success-600)",
  INACTIVE: "var(--stone-500)",
  EXPIRED: "var(--error-600)",
  LAPSED: "var(--warning-600)",
  CANCELLED: "var(--error-600)",
  PENDING: "var(--gold-600)",
};

export default function MyCoverage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      setLoading(true);
      setError(null);
      const result = await api.client.policies();
      setPolicies(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load policies";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PortalShell><div style={{ padding: "44px" }}>Loading policies...</div></PortalShell>;

  return (
    <PortalShell>
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "24px", marginTop: "0" }}>
          My Coverage
        </h1>

        {error && (
          <div
            style={{
              padding: "16px",
              background: "var(--error-100)",
              border: `1px solid var(--error-600)`,
              borderRadius: "8px",
              color: "var(--error-600)",
              marginBottom: "24px",
            }}
          >
            {error}
          </div>
        )}

        {policies.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              background: "var(--surface-alt)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-muted)", margin: "0" }}>
              No policies recorded on file. If you believe this is incorrect, please contact us.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "var(--surface-card)",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "var(--text-strong)",
                    }}
                  >
                    Policy #
                  </th>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", fontSize: "14px", color: "var(--text-strong)" }}>
                    Type
                  </th>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", fontSize: "14px", color: "var(--text-strong)" }}>
                    Coverage Amount
                  </th>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", fontSize: "14px", color: "var(--text-strong)" }}>
                    Premium
                  </th>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", fontSize: "14px", color: "var(--text-strong)" }}>
                    Beneficiary
                  </th>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", fontSize: "14px", color: "var(--text-strong)" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy, idx) => (
                  <tr
                    key={policy.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: idx % 2 === 0 ? "var(--surface-card)" : "var(--surface-alt)",
                    }}
                  >
                    <td style={{ padding: "16px", color: "var(--text-body)" }}>{policy.policyNumber}</td>
                    <td style={{ padding: "16px", color: "var(--text-body)" }}>
                      {POLICY_TYPE_LABELS[policy.policyType]}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-body)" }}>
                      ${formatCurrency(Number(policy.coverageAmount))}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-body)" }}>
                      {policy.premium ? `$${formatCurrency(Number(policy.premium))}${policy.premiumFrequency ? `/${policy.premiumFrequency}` : ""}` : "—"}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-body)" }}>
                      {policy.beneficiary || "—"}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: STATUS_COLORS[policy.status],
                          color: "#ffffff",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
