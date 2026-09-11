import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ActionItem, Message, Policy } from "../api/client";
import { PortalShell } from "../components/PortalShell";
import { Badge, Button } from "../components/ui";
import { CarrierPipelineTimeline } from "../components/CarrierPipelineTimeline";

type Onboarding = Awaited<ReturnType<typeof api.client.onboarding>>;

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<Onboarding | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.client.onboarding(),
      api.client.policies().catch(() => ({ data: [] })),
    ])
      .then(([onboardingData, policiesData]) => {
        setData(onboardingData);
        setPolicies(policiesData.data || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) return <PortalShell><div style={{ padding: 44 }}>{error}</div></PortalShell>;
  if (!data) return <PortalShell><div style={{ padding: 44 }}>Loading…</div></PortalShell>;

  const onboardingSubtitle = data.allPhasesComplete ? "Onboarding complete" : "Your progress so far";
  const phaseSummaries = data.allPhasesComplete ? [] : getPhaseSummaries(data);

  return (
    <PortalShell>
      <div className="sc-page" style={{ maxWidth: 960, padding: "52px 0 60px" }}>
        <div style={{ marginBottom: 40 }}>
          <div className="sc-eyebrow" style={{ marginBottom: 12 }}>Dashboard</div>
          <h1 className="sc-heading" style={{ fontSize: 32 }}>
            Welcome back, {data.client.firstName}
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 22,
            marginBottom: 22,
          }}
        >
          <DashboardCard
            title="Onboarding"
            subtitle={onboardingSubtitle}
            onClick={() => navigate("/journey")}
          >
            {phaseSummaries.length === 0 && !data.allPhasesComplete && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--stone-600)" }}>
                Not started yet — click to begin with Phase 1.
              </div>
            )}
            {phaseSummaries.map((summary) => (
              <div key={summary.phase} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span className="sc-eyebrow" style={{ fontSize: 10 }}>Phase {summary.phase}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-700)" }}>{summary.label}</span>
                </div>
                {summary.phase === data.currentPhase && data.nextActionHint && (
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--stone-600)" }}>
                    What's next: {data.nextActionHint}
                  </div>
                )}
                {summary.phase === 3 && (
                  <CarrierPipelineTimeline items={data.phase3Checklist} />
                )}
              </div>
            ))}
          </DashboardCard>

          <AskBrockQuickAsk />
        </div>

        <div style={{ marginBottom: 40 }}>
          <MyCoverageSummary policies={policies} onViewAll={() => navigate("/coverage")} />
        </div>

        <ActionItemsSection />
      </div>
    </PortalShell>
  );
}

function getPhaseSummaries(data: Onboarding) {
  const summaries: Array<{ phase: number; label: string }> = [];

  const statusByPhase = new Map(data.progress.map((p) => [p.phase, p.status]));

  // Phase 1 — started once any document is uploaded or flagged missing, or already complete.
  const uploadedCount = data.phase1Categories.filter((c) => c.uploaded).length;
  const totalCount = data.phase1Categories.length;
  const phase1Touched = uploadedCount > 0 || data.phase1Categories.some((c) => c.missing);
  if (phase1Touched || statusByPhase.get(1) === "COMPLETE") {
    summaries.push({
      phase: 1,
      label: statusByPhase.get(1) === "COMPLETE" ? "Documents complete" : `${uploadedCount} of ${totalCount} documents`,
    });
  }

  // Phase 2 — started once any checklist item is complete, or the phase itself is complete.
  const phase2CompletedCount = data.phase2Checklist.filter((i) => i.completed).length;
  if (phase2CompletedCount > 0 || statusByPhase.get(2) === "COMPLETE") {
    summaries.push({
      phase: 2,
      label:
        statusByPhase.get(2) === "COMPLETE"
          ? "Cash flow complete"
          : `${phase2CompletedCount} of ${data.phase2Checklist.length} steps`,
    });
  }

  // Phase 3 — started once the application (or anything after it) is complete.
  const applicationDone = data.phase3Checklist.find((i) => i.key === "application")?.completed ?? false;
  const anyPhase3Done = data.phase3Checklist.some((i) => i.completed);
  if (anyPhase3Done || statusByPhase.get(3) === "COMPLETE") {
    const nextPipelineStep = data.phase3Checklist.find((i) => i.key !== "application" && !i.completed);
    let label = "Turbocharger complete";
    if (statusByPhase.get(3) !== "COMPLETE") {
      label = !applicationDone ? "Application pending" : nextPipelineStep?.label ?? "Turbocharger complete";
    }
    summaries.push({ phase: 3, label });
  }

  // Phase 4 — no client-side action exists, so "started" just means the handoff is done.
  if (data.phase4.legacyHandoffCompletedAt) {
    summaries.push({ phase: 4, label: "Handoff complete" });
  }

  return summaries;
}

function DashboardCard({
  title,
  subtitle,
  badge,
  disabled = false,
  onClick,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        background: "#fff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        padding: "30px 28px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 className="sc-heading" style={{ fontSize: 20 }}>{title}</h2>
        {badge && <Badge tone="stone">{badge}</Badge>}
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-500)" }}>{subtitle}</div>
      {children}
      {!disabled && (
        <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--navy-700)", marginTop: 8 }}>
          Open →
        </div>
      )}
    </div>
  );
}

function AskBrockQuickAsk() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    navigate(q ? `/ask-brock?q=${encodeURIComponent(q)}` : "/ask-brock");
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        padding: "30px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h2 className="sc-heading" style={{ fontSize: 20 }}>Ask Brock</h2>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-500)" }}>
        Get answers in Brock's own words
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question here"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            padding: "10px 12px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            outline: "none",
          }}
        />
        <Button type="submit" variant="primary" style={{ padding: "10px 18px", fontSize: 11, flex: "none" }}>
          Go
        </Button>
      </form>
    </div>
  );
}

function ActionItemsSection() {
  const [items, setItems] = useState<ActionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    try {
      const result = await api.client.actionItems();
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load action items");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleComplete(id: string) {
    setPendingId(id);
    try {
      await api.client.completeActionItem(id);
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this item");
    } finally {
      setPendingId(null);
    }
  }

  if (error) return <div style={{ color: "var(--error-600, #b33)", fontSize: 14 }}>{error}</div>;
  if (!items) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        padding: "30px 28px",
      }}
    >
      <h2 className="sc-heading" style={{ fontSize: 22, marginBottom: 20 }}>Action Items</h2>

      {items.length === 0 ? (
        <p style={{ margin: "0 0 24px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>
          You're all caught up — no open action items right now.
        </p>
      ) : (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 24 }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "16px 20px",
                borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <div style={{ flex: "1 1 220px", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--ink-700)" }}>
                {i + 1}. {item.text}
              </div>
              <Button
                variant="outline"
                style={{ padding: "8px 16px", fontSize: 11 }}
                disabled={pendingId === item.id}
                onClick={() => handleComplete(item.id)}
              >
                {pendingId === item.id ? "Saving…" : "Complete"}
              </Button>
            </div>
          ))}
        </div>
      )}

      <TeamChatBox />
    </div>
  );
}

function TeamChatBox() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await api.client.messages();
      setMessages(result.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      await api.client.sendMessage(text);
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
      <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-700)" }}>
        Have a question about your action items? Chat with our team below.
      </p>

      {messages && messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.authorRole === "ADMIN" ? "flex-start" : "flex-end",
                maxWidth: "80%",
                background: m.authorRole === "ADMIN" ? "var(--paper-alt)" : "var(--navy-700)",
                color: m.authorRole === "ADMIN" ? "var(--ink-700)" : "#fff",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              {m.body}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your question here — our team will be in touch"
          style={{
            flex: "1 1 240px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            padding: "12px 14px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            outline: "none",
          }}
        />
        <Button type="submit" variant="primary" disabled={sending} style={{ padding: "12px 22px", fontSize: 11, flex: "none" }}>
          {sending ? "Sending…" : "Go!"}
        </Button>
      </form>
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

function MyCoverageSummary({ policies, onViewAll }: { policies: Policy[]; onViewAll: () => void }) {
  const recentPolicies = policies.slice(0, 3);

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  return (
    <DashboardCard title="My Coverage" subtitle={policies.length > 0 ? `${policies.length} ${policies.length === 1 ? "policy" : "policies"}` : "No policies"} onClick={onViewAll}>
      {policies.length === 0 ? (
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--stone-600)" }}>
          Nothing to show yet. Check back soon!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {recentPolicies.map((policy) => (
            <div
              key={policy.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-body)",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "var(--ink-700)" }}>{policy.policyNumber}</span>
                <span
                  style={{
                    background: policy.status === "ACTIVE" ? "var(--success-100)" : "var(--stone-100)",
                    color: policy.status === "ACTIVE" ? "var(--success-600)" : "var(--stone-700)",
                    padding: "2px 8px",
                    borderRadius: "3px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {policy.status}
                </span>
              </div>
              <div style={{ color: "var(--stone-600)", marginBottom: 2 }}>
                Coverage: ${formatCurrency(Number(policy.coverageAmount))}
              </div>
              {policy.premium && (
                <div style={{ color: "var(--stone-600)" }}>
                  Premium: ${formatCurrency(Number(policy.premium))}/{policy.premiumFrequency || "month"}
                </div>
              )}
            </div>
          ))}
          {policies.length > 3 && (
            <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--navy-600)", fontWeight: 600, cursor: "pointer" }} onClick={onViewAll}>
              View all {policies.length} policies →
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
