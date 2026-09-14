import React, { useState } from "react";
import { api } from "../api/client";
import { Button } from "./ui";

interface ResendInviteButtonProps {
  clientId: string;
  passwordSet: boolean;
  onSuccess?: () => void;
}

export function ResendInviteButton({ clientId, passwordSet, onSuccess }: ResendInviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (passwordSet) {
    return null;
  }

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    try {
      await api.admin.resendInvite(clientId);
      setMessage({ type: "success", text: "Invitation email resent successfully!" });
      onSuccess?.();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to resend invitation",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "#fff9e6", border: "1px solid #ffd700" }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 14, color: "#333" }}>
          This client hasn't set up their password yet.{" "}
          <Button
            onClick={handleResend}
            disabled={loading}
            style={{
              display: "inline",
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--navy-700)",
              textDecoration: "underline",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {loading ? "Sending…" : "Resend invitation email"}
          </Button>
        </p>
      </div>
      {message && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: message.type === "success" ? "#e6f5e6" : "#ffe6e6",
            border: `1px solid ${message.type === "success" ? "#6bc76b" : "#ff6b6b"}`,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: message.type === "success" ? "#2d5f2d" : "#cc0000",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
