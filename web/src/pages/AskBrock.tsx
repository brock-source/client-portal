import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { PortalShell } from "../components/PortalShell";
import { Button } from "../components/ui";

const SUGGESTED_QUESTIONS = [
  "What is the Rockefeller method?",
  "How much should I keep in my reservoir?",
  "Should I pay off my mortgage early?",
];

interface ThreadEntry {
  id: string;
  question: string;
  answer?: string;
  grounded?: boolean;
  sources?: Array<{ title: string; webViewLink: string | null }>;
  error?: string;
  pending: boolean;
}

function useAskerInitials() {
  const { me } = useAuth();
  if (me?.client) {
    return `${me.client.firstName[0]}${me.client.lastName[0]}`.toUpperCase();
  }
  return me?.email ? me.email[0].toUpperCase() : "?";
}

export default function AskBrock() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const backTo = me?.role === "ADMIN" ? "/admin/clients" : "/dashboard";
  const backLabel = me?.role === "ADMIN" ? "← Back to clients" : "← Back to dashboard";
  const initials = useAskerInitials();
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoAskedRef = useRef(false);

  async function submitQuestion(q: string) {
    const text = q.trim();
    if (!text) return;
    const id = `${Date.now()}-${Math.random()}`;
    setThread((t) => [...t, { id, question: text, pending: true }]);
    setQuestion("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const result = await api.askBrock.ask(text);
      setThread((t) =>
        t.map((entry) =>
          entry.id === id
            ? { ...entry, pending: false, answer: result.answer, grounded: result.grounded, sources: result.sources }
            : entry
        )
      );
    } catch (err) {
      setThread((t) =>
        t.map((entry) =>
          entry.id === id
            ? { ...entry, pending: false, error: err instanceof Error ? err.message : "Something went wrong." }
            : entry
        )
      );
    } finally {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitQuestion(question);
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoAskedRef.current) {
      autoAskedRef.current = true;
      submitQuestion(q);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PortalShell>
      <div style={{ background: "#fff", paddingTop: 32, paddingBottom: 60 }}>
        <div className="sc-page" style={{ maxWidth: 760 }}>
          <div style={{ marginBottom: 24 }}>
            <span
              onClick={() => navigate(backTo)}
              style={{
                cursor: "pointer",
                fontFamily: "var(--font-label)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--navy-700)",
              }}
            >
              {backLabel}
            </span>
          </div>

          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div className="sc-eyebrow" style={{ marginBottom: 16 }}>Ask Brock</div>
            <h1 className="sc-heading" style={{ fontSize: 34, marginBottom: 14 }}>Ask him anything</h1>
            <p
              style={{
                margin: "0 auto",
                maxWidth: 500,
                fontFamily: "var(--font-body)",
                fontSize: 17,
                lineHeight: 1.75,
                color: "var(--text-body)",
              }}
            >
              Answers drawn from Brock's own articles, newsletters, and posts. For anything about{" "}
              <em>your</em> plan, message your advisor team.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexWrap: "wrap",
              border: "1px solid var(--navy-600)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              marginBottom: 16,
            }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How much should I keep in my reservoir account?"
              style={{
                flex: "1 1 240px",
                border: "none",
                outline: "none",
                padding: "18px 20px",
                fontFamily: "var(--font-body)",
                fontSize: 16,
                color: "var(--ink-900)",
              }}
            />
            <button
              type="submit"
              style={{
                flex: "none",
                background: "var(--ink-900)",
                color: "#fff",
                border: "none",
                padding: "18px 26px",
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontFamily: "var(--font-label)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Ask <span style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}>→</span>
            </button>
          </form>

          {thread.length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 44 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <span
                  key={q}
                  onClick={() => submitQuestion(q)}
                  style={{
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    color: "var(--navy-700)",
                    border: "1px solid var(--navy-100)",
                    borderRadius: "var(--radius-pill)",
                    padding: "8px 16px",
                  }}
                >
                  → {q}
                </span>
              ))}
            </div>
          )}

          {thread.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 36, display: "flex", flexDirection: "column", gap: 36 }}>
              {thread.map((entry) => (
                <ThreadItem key={entry.id} entry={entry} askerInitials={initials} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function ThreadItem({ entry, askerInitials }: { entry: ThreadEntry; askerInitials: string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <Avatar initials={askerInitials} tone="light" />
        <p style={{ margin: 0, paddingTop: 5, fontFamily: "var(--font-body)", fontSize: 18, lineHeight: 1.6, color: "var(--ink-900)" }}>
          {entry.question}
        </p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <Avatar initials="BF" tone="navy" />
        <div style={{ flex: 1 }}>
          <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--stone-700)", marginBottom: 14 }}>
            Brock, in his own words
          </div>
          {entry.pending && (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--stone-500)" }}>Thinking…</div>
          )}
          {entry.error && (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--error-600, #b33)" }}>{entry.error}</div>
          )}
          {entry.answer && (
            <>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.8, color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
                {entry.answer}
              </div>
              {entry.grounded && entry.sources && entry.sources.length > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    fontFamily: "var(--font-label)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--stone-500)",
                  }}
                >
                  Source{entry.sources.length > 1 ? "s" : ""}: {entry.sources.map((s) => s.title).join(", ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ initials, tone }: { initials: string; tone: "light" | "navy" }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        flex: "none",
        borderRadius: tone === "navy" ? 0 : "50%",
        background: tone === "navy" ? "var(--navy-700)" : "var(--stone-100)",
        border: tone === "light" ? "1px solid var(--border-subtle)" : "none",
        color: tone === "navy" ? "#fff" : "var(--stone-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: tone === "navy" ? "var(--font-display)" : "var(--font-label)",
        fontSize: tone === "navy" ? 13 : 11,
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  );
}
