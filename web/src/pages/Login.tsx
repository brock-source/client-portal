import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { Button } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await api.login(email, password);
      await refresh();
      navigate(me.role === "ADMIN" ? "/admin/clients" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
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
          Private Client Portal
        </h1>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>
            Password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 14 }}>{error}</div>}
        <Button type="submit" disabled={submitting} arrow>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
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
