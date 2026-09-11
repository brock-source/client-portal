import { useState } from "react";
import { Policy } from "../api/client";

const POLICY_TYPES = ["LIFE", "DISABILITY", "LONG_TERM_CARE", "UMBRELLA", "HEALTH", "OTHER"] as const;
const POLICY_STATUSES = ["ACTIVE", "INACTIVE", "EXPIRED", "LAPSED", "CANCELLED", "PENDING"] as const;
const PREMIUM_FREQUENCIES = ["monthly", "annual", "quarterly"];

interface PolicyFormModalProps {
  policy?: Policy | null;
  onSubmit: (data: Partial<Policy>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PolicyFormModal({ policy, onSubmit, onCancel, loading = false }: PolicyFormModalProps) {
  const [formData, setFormData] = useState<Partial<Policy>>(
    policy || {
      policyNumber: "",
      policyType: "LIFE",
      status: "ACTIVE",
      coverageAmount: 0,
      premium: undefined,
      premiumFrequency: "annual",
      beneficiary: "",
      insurer: "",
      issueDate: new Date().toISOString().split("T")[0],
      expirationDate: undefined,
    }
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);

      if (!formData.policyNumber?.trim()) {
        setError("Policy number is required");
        return;
      }
      if (!formData.policyType) {
        setError("Policy type is required");
        return;
      }
      if (!formData.coverageAmount || formData.coverageAmount <= 0) {
        setError("Coverage amount must be greater than 0");
        return;
      }
      if (!formData.issueDate) {
        setError("Issue date is required");
        return;
      }

      const submitData = {
        ...formData,
        issueDate: new Date(formData.issueDate as string).toISOString(),
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate as string).toISOString() : undefined,
      };

      await onSubmit(submitData as Partial<Policy>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    }
  }

  return (
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
      onClick={onCancel}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: "24px", fontSize: "20px", fontWeight: "600" }}>
          {policy ? "Edit Policy" : "Add Policy"}
        </h2>

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Policy Number *
            </label>
            <input
              type="text"
              value={formData.policyNumber || ""}
              onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Type *
            </label>
            <select
              value={formData.policyType || "LIFE"}
              onChange={(e) => setFormData({ ...formData, policyType: e.target.value as Policy["policyType"] })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            >
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Status
            </label>
            <select
              value={formData.status || "ACTIVE"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Policy["status"] })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            >
              {POLICY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Insurer
            </label>
            <input
              type="text"
              value={formData.insurer || ""}
              onChange={(e) => setFormData({ ...formData, insurer: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Coverage Amount *
            </label>
            <input
              type="number"
              value={formData.coverageAmount || ""}
              onChange={(e) => setFormData({ ...formData, coverageAmount: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Premium
            </label>
            <input
              type="number"
              value={formData.premium || ""}
              onChange={(e) => setFormData({ ...formData, premium: e.target.value ? Number(e.target.value) : undefined })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Premium Frequency
            </label>
            <select
              value={formData.premiumFrequency || "annual"}
              onChange={(e) => setFormData({ ...formData, premiumFrequency: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            >
              {PREMIUM_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Beneficiary
            </label>
            <input
              type="text"
              value={formData.beneficiary || ""}
              onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Issue Date *
            </label>
            <input
              type="date"
              value={formData.issueDate ? new Date(formData.issueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-strong)" }}>
              Expiration Date
            </label>
            <input
              type="date"
              value={formData.expirationDate ? new Date(formData.expirationDate).toISOString().split("T")[0] : ""}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value || undefined })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "var(--navy-800)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Saving..." : "Save Policy"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
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
        </form>
      </div>
    </div>
  );
}
