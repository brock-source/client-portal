import { useEffect, useState } from "react";
import { api, Policy } from "../api/client";
import { PolicyFormModal } from "./PolicyFormModal";

const POLICY_TYPE_LABELS: Record<Policy["policyType"], string> = {
  LIFE: "Life",
  DISABILITY: "Disability",
  LONG_TERM_CARE: "LTC",
  UMBRELLA: "Umbrella",
  HEALTH: "Health",
  OTHER: "Other",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface PolicyManagementSectionProps {
  clientId: string;
  onChange?: () => void;
}

export function PolicyManagementSection({ clientId, onChange }: PolicyManagementSectionProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPolicies();
  }, [clientId]);

  async function loadPolicies() {
    try {
      setLoading(true);
      setError(null);
      const result = await api.admin.listPolicies(clientId);
      setPolicies(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load policies";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setEditingPolicy(null);
    setShowModal(true);
  }

  async function handleEdit(policy: Policy) {
    setEditingPolicy(policy);
    setShowModal(true);
  }

  async function handleDelete(policyId: string) {
    try {
      setError(null);
      await api.admin.deletePolicy(clientId, policyId);
      setPolicies(policies.filter((p) => p.id !== policyId));
      setDeleteConfirm(null);
      onChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete policy";
      setError(message);
    }
  }

  async function handleSubmit(data: Partial<Policy>) {
    try {
      setModalLoading(true);
      setError(null);

      if (editingPolicy) {
        const result = await api.admin.updatePolicy(clientId, editingPolicy.id, data);
        setPolicies(policies.map((p) => (p.id === editingPolicy.id ? result.data : p)));
      } else {
        const result = await api.admin.createPolicy(clientId, data);
        setPolicies([result.data, ...policies]);
      }

      setShowModal(false);
      setEditingPolicy(null);
      onChange?.();
    } catch (err) {
      throw err;
    } finally {
      setModalLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "16px", color: "var(--text-muted)" }}>Loading policies...</div>;

  return (
    <div>
      {error && (
        <div
          style={{
            padding: "12px",
            background: "var(--error-100)",
            border: "1px solid var(--error-600)",
            borderRadius: "4px",
            color: "var(--error-600)",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={handleAdd}
          style={{
            padding: "8px 16px",
            background: "var(--navy-800)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          + Add Policy
        </button>
      </div>

      {policies.length === 0 ? (
        <div
          style={{
            padding: "24px",
            background: "var(--surface-alt)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "4px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          No policies on file
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                  Number
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                  Type
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                  Coverage
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                  Premium
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                  Status
                </th>
                <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", fontSize: "13px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy, idx) => (
                <tr
                  key={policy.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: idx % 2 === 0 ? "white" : "var(--surface-alt)",
                  }}
                >
                  <td style={{ padding: "12px", fontSize: "14px" }}>{policy.policyNumber}</td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>{POLICY_TYPE_LABELS[policy.policyType]}</td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>${formatCurrency(Number(policy.coverageAmount))}</td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {policy.premium ? `$${formatCurrency(Number(policy.premium))}` : "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        background: policy.status === "ACTIVE" ? "var(--success-100)" : "var(--stone-100)",
                        color: policy.status === "ACTIVE" ? "var(--success-600)" : "var(--stone-700)",
                        borderRadius: "3px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {policy.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(policy)}
                      style={{
                        padding: "4px 8px",
                        background: "transparent",
                        color: "var(--navy-600)",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        marginRight: "8px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(policy.id)}
                      style={{
                        padding: "4px 8px",
                        background: "transparent",
                        color: "var(--error-600)",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PolicyFormModal
          policy={editingPolicy}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={modalLoading}
        />
      )}

      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Delete Policy?</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
              This action cannot be undone. The policy record will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "var(--error-600)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "transparent",
                  color: "var(--navy-800)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
