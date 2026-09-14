import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { Button } from "../components/ui";

export default function VerifyOTP() {
  const [params] = useSearchParams();
  const userId = params.get("userId") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Code must be 6 digits");
      return;
    }

    setSubmitting(true);
    try {
      const me = await api.verifyOtp(userId, code);
      await refresh();
      navigate(me.role === "ADMIN" ? "/admin/clients" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!userId) {
    return <Centered>This verification link is missing its user ID.</Centered>;
  }

  if (timeLeft === 0) {
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <h2 className="sc-heading">Code Expired</h2>
          <p style={{ marginTop: 12, marginBottom: 24 }}>Please sign in again to get a new code.</p>
          <Button onClick={() => navigate("/login")} arrow>
            Back to Sign In
          </Button>
        </div>
      </Centered>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
          Verify Your Code
        </h1>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)" }}>
          Enter the 6-digit code sent to your phone.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>
            Verification Code
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            style={{
              ...inputStyle,
              fontSize: 24,
              letterSpacing: 8,
              textAlign: "center",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
            autoComplete="one-time-code"
          />
        </label>
        <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
          Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
        {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 14 }}>{error}</div>}
        <Button type="submit" disabled={submitting || code.length !== 6} arrow>
          {submitting ? "Verifying…" : "Verify"}
        </Button>
        <Button
          type="button"
          onClick={() => navigate("/login")}
          style={{
            background: "transparent",
            color: "var(--text-body)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          Back to Sign In
        </Button>
      </form>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 16 }}>{children}</div>
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
