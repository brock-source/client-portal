import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.setPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <Centered>This invite link is missing its token.</Centered>;
  }

  if (done) {
    return <Centered>Password set. Redirecting to sign in…</Centered>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          padding: 40,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <img src="/assets/logo.png" alt="StoneCentury Financial" style={{ height: 40, width: "auto", alignSelf: "flex-start", marginBottom: 8 }} />
        <h1 className="sc-heading" style={{ fontSize: 22 }}>
          Welcome to StoneCentury
        </h1>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)" }}>
          Set a password to access your private portal.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>
            New password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>
            Confirm password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 14 }}>{error}</div>}
        <Button type="submit" disabled={submitting} arrow>
          {submitting ? "Saving…" : "Set password"}
        </Button>
      </form>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 16 }}>{children}</p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 15,
  padding: "12px 14px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  outline: "none",
};
