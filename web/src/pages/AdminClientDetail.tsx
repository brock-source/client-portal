import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, HEALTH_RATING_OPTIONS } from "../api/client";
import { PortalShell } from "../components/PortalShell";
import { Badge, Button } from "../components/ui";
import { PolicyManagementSection } from "../components/PolicyManagementSection";

type Detail = Awaited<ReturnType<typeof api.admin.clientDetail>>;

export default function AdminClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!clientId) return;
    try {
      setData(await api.admin.clientDetail(clientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  if (error) return <PortalShell><div style={{ padding: 44 }}>{error}</div></PortalShell>;
  if (!data) return <PortalShell><div style={{ padding: 44 }}>Loading…</div></PortalShell>;

  const phase2Status = data.progress.find((p) => p.phase === 2)?.status;
  const phase3Status = data.progress.find((p) => p.phase === 3)?.status;
  const phase4Status = data.progress.find((p) => p.phase === 4)?.status;

  return (
    <PortalShell>
      <div className="sc-page" style={{ maxWidth: 1140, paddingTop: 44, paddingBottom: 44 }}>
        <span
          onClick={() => navigate("/admin/clients")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--navy-700)" }}
        >
          ← All clients
        </span>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "16px 0 30px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="sc-heading" style={{ fontSize: 28 }}>{data.client.firstName} {data.client.lastName}</h1>
              {data.client.healthRating && <Badge tone="gold">{data.client.healthRating}</Badge>}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)", marginTop: 4 }}>
              {data.client.email} {data.client.phone ? `· ${data.client.phone}` : ""}
            </div>
          </div>
          <DeleteClientButton clientId={data.client.id} fullName={`${data.client.firstName} ${data.client.lastName}`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 36 }}>
          {data.progress.map((p) => (
            <div key={p.phase} style={{ textAlign: "center", padding: "14px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "#fff" }}>
              <div className="sc-eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>Phase {p.phase}</div>
              <Badge tone={p.status === "COMPLETE" ? "success" : p.status === "IN_PROGRESS" ? "gold" : "stone"}>
                {p.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>

        <Section title="Phase 1 · Documents">
          <Phase1AdminSection clientId={data.client.id} categories={data.phase1Categories} onChange={load} />
        </Section>

        <Section title="Phase 2 · Cash Flow Checklist">
          <ChecklistReadout items={data.phase2Checklist} clientId={data.client.id} onChange={load} disabled={phase2Status === "LOCKED"} />
        </Section>

        <Section title="Phase 3 · Turbocharger Pipeline">
          <ChecklistReadout items={data.phase3Checklist} highlightAdminActions clientId={data.client.id} onChange={load} disabled={phase3Status === "LOCKED"} />

          <div style={{ marginTop: 20 }}>
            <HealthRatingField clientId={data.client.id} current={data.client.healthRating} onChange={load} />
          </div>
        </Section>

        <Section title="Phase 4 · Legacy Handoff">
          {data.client.legacyHandoffCompletedAt ? (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-700)" }}>
              Handoff completed on {new Date(data.client.legacyHandoffCompletedAt).toLocaleDateString()}.
            </div>
          ) : phase4Status === "IN_PROGRESS" ? (
            <Phase4Action clientId={data.client.id} onChange={load} />
          ) : (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>
              Not active yet — unlocks after Phase 3.
            </div>
          )}
        </Section>

        <Section title="Action Items">
          <ActionItemsAdminSection clientId={data.client.id} items={data.actionItems} onChange={load} />
        </Section>

        <Section title="Messages">
          <MessageThread clientId={data.client.id} messages={data.messages} onChange={load} />
        </Section>

        <Section title="Policy Management">
          <PolicyManagementSection clientId={data.client.id} onChange={load} />
        </Section>
      </div>
    </PortalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <h2 className="sc-heading" style={{ fontSize: 16, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}

function ChecklistReadout({
  items,
  highlightAdminActions = false,
  clientId,
  onChange,
  disabled = false,
}: {
  items: Detail["phase2Checklist"];
  highlightAdminActions?: boolean;
  clientId: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstIncompleteIndex = items.findIndex((i) => !i.completed);

  async function handleComplete(itemId: string) {
    setError(null);
    setPendingId(itemId);
    try {
      await api.admin.completeChecklistItem(clientId, itemId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this step");
    } finally {
      setPendingId(null);
    }
  }

  async function handleIncomplete(itemId: string) {
    setError(null);
    setPendingId(itemId);
    try {
      await api.admin.uncompleteChecklistItem(clientId, itemId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this step");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#fff" }}>
      {items.map((item, i) => {
        const isNextAdminAction =
          highlightAdminActions && item.completedBy === "ADMIN" && !item.completed && i === firstIncompleteIndex && !disabled;
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.completed ? "var(--success-600, #2f8f4e)" : "var(--stone-300)", flex: "none" }} />
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-700)" }}>{item.label}</span>
            <Badge tone={item.completedBy === "ADMIN" ? "navy" : "stone"}>{item.completedBy === "ADMIN" ? "Advisor" : "Client"}</Badge>
            {isNextAdminAction && (
              <Button variant="outline" style={{ padding: "6px 14px", fontSize: 11 }} disabled={pendingId === item.id} onClick={() => handleComplete(item.id)}>
                {pendingId === item.id ? "Saving…" : "Mark complete"}
              </Button>
            )}
            {item.completed && !disabled && (
              <Button variant="ghost" style={{ padding: "6px 14px", fontSize: 11 }} disabled={pendingId === item.id} onClick={() => handleIncomplete(item.id)}>
                {pendingId === item.id ? "Saving…" : "Mark as incomplete"}
              </Button>
            )}
          </div>
        );
      })}
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, padding: "10px 16px" }}>{error}</div>}
    </div>
  );
}

function Phase1AdminSection({
  clientId,
  categories,
  onChange,
}: {
  clientId: string;
  categories: Detail["phase1Categories"];
  onChange: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleUpload(categoryId: string, file: File | undefined) {
    if (!file) return;
    setError(null);
    setPendingId(categoryId);
    try {
      await api.admin.uploadDocument(clientId, categoryId, file);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(categoryId: string) {
    setError(null);
    setPendingId(categoryId);
    try {
      await api.admin.deleteDocument(clientId, categoryId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove document");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {categories.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              background: c.uploaded ? "#fff" : c.missing ? "var(--paper-alt)" : "var(--paper-warm)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flex: "none",
                background: c.uploaded ? "var(--success-600, #2f8f4e)" : c.missing ? "var(--gold-500)" : "var(--stone-300)",
              }}
            />
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-700)" }}>
              {c.label}
              {c.missing && !c.uploaded && (
                <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold-700)", marginTop: 2 }}>
                  Client marked as not available
                </span>
              )}
            </span>
            <input
              type="file"
              ref={(el) => (fileInputs.current[c.id] = el)}
              style={{ display: "none" }}
              onChange={(e) => handleUpload(c.id, e.target.files?.[0])}
            />
            {c.uploaded && (
              <Button variant="ghost" style={{ padding: "5px 10px", fontSize: 10 }} disabled={pendingId === c.id} onClick={() => handleRemove(c.id)}>
                {pendingId === c.id ? "…" : "Remove"}
              </Button>
            )}
            <Button
              variant="outline"
              style={{ padding: "5px 10px", fontSize: 10 }}
              disabled={pendingId === c.id}
              onClick={() => fileInputs.current[c.id]?.click()}
            >
              {pendingId === c.id ? "…" : c.uploaded ? "Replace" : "Upload for client"}
            </Button>
          </div>
        ))}
      </div>
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

export function HealthRatingField({ clientId, current, onChange }: { clientId: string; current: string | null; onChange: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(rating: string) {
    if (!rating || rating === current) return;
    setSaving(true);
    setError(null);
    try {
      await api.admin.setHealthRating(clientId, rating);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, maxWidth: 260 }}>
        <span className="sc-eyebrow" style={{ fontSize: 10 }}>Health rating</span>
        <select
          value={current ?? ""}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          style={{ fontFamily: "var(--font-body)", fontSize: 14, padding: "10px 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", outline: "none", background: "#fff" }}
        >
          <option value="" disabled>
            Select a rating…
          </option>
          {HEALTH_RATING_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {saving && <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--stone-500)" }}>Saving…</span>}
      {error && <span style={{ color: "var(--error-600, #b33)", fontSize: 13 }}>{error}</span>}
    </div>
  );
}

function Phase4Action({ clientId, onChange }: { clientId: string; onChange: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await api.admin.completePhase4(clientId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>
        Mark this once the estate-planning partner handoff is complete.
      </p>
      <Button variant="primary" disabled={saving} onClick={handleComplete}>
        {saving ? "Saving…" : "Mark legacy handoff complete"}
      </Button>
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

function ActionItemsAdminSection({
  clientId,
  items,
  onChange,
}: {
  clientId: string;
  items: Detail["actionItems"];
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.admin.addActionItem(clientId, text.trim());
      setText("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(itemId: string) {
    setPendingId(itemId);
    setError(null);
    try {
      await api.admin.deleteActionItem(clientId, itemId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove item");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          value={text}
          placeholder="Type a new action item…"
          onChange={(e) => setText(e.target.value)}
          style={{
            flex: "1 1 240px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            padding: "10px 12px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            outline: "none",
          }}
        />
        <Button variant="outline" style={{ padding: "10px 18px", fontSize: 11 }} disabled={saving} onClick={handleAdd}>
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>No action items yet.</div>
      ) : (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#fff" }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-700)" }}>{item.text}</span>
              <Badge tone={item.completed ? "success" : "stone"}>{item.completed ? "Complete" : "Open"}</Badge>
              <Button
                variant="ghost"
                style={{ padding: "6px 14px", fontSize: 11 }}
                disabled={pendingId === item.id}
                onClick={() => handleRemove(item.id)}
              >
                {pendingId === item.id ? "…" : "Remove"}
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

function MessageThread({
  clientId,
  messages,
  onChange,
}: {
  clientId: string;
  messages: Detail["messages"];
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.markMessagesRead(clientId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleReply() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.admin.sendMessage(clientId, body.trim());
      setBody("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {messages.length === 0 ? (
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)", marginBottom: 16 }}>
          No messages yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.authorRole === "ADMIN" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: m.authorRole === "ADMIN" ? "var(--navy-700)" : "var(--paper-alt)",
                color: m.authorRole === "ADMIN" ? "#fff" : "var(--ink-700)",
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input
          type="text"
          value={body}
          placeholder="Reply to this client…"
          onChange={(e) => setBody(e.target.value)}
          style={{
            flex: "1 1 240px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            padding: "10px 12px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            outline: "none",
          }}
        />
        <Button variant="outline" style={{ padding: "10px 18px", fontSize: 11 }} disabled={sending} onClick={handleReply}>
          {sending ? "Sending…" : "Reply"}
        </Button>
      </div>
      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

const DANGER = "var(--error-600, #b33)";
const ARM_TIMEOUT_MS = 3000;

export function DeleteClientButton({ clientId, fullName }: { clientId: string; fullName: string }) {
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current);
  }, []);

  function handleClick() {
    if (!armed) {
      setArmed(true);
      armTimeoutRef.current = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
      return;
    }
    if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current);
    setArmed(false);
    setShowModal(true);
  }

  return (
    <>
      <Button
        variant="outline"
        style={{ padding: "10px 18px", fontSize: 11, borderColor: DANGER, color: DANGER, flex: "none" }}
        onClick={handleClick}
      >
        {armed ? "Click again to confirm" : "Delete Client"}
      </Button>
      {showModal && (
        <DeleteClientModal
          clientId={clientId}
          fullName={fullName}
          onClose={() => setShowModal(false)}
          onDeleted={() => navigate("/admin/clients")}
        />
      )}
    </>
  );
}

function DeleteClientModal({
  clientId,
  fullName,
  onClose,
  onDeleted,
}: {
  clientId: string;
  fullName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = value.trim();
  const matches = trimmed.toLowerCase() === fullName.toLowerCase();

  async function handleDelete() {
    if (!matches) return;
    setSaving(true);
    setError(null);
    try {
      // Send the canonical name (not the admin's typed casing) — matching is
      // case-insensitive above so the two can legitimately differ in case.
      await api.admin.deleteClient(clientId, fullName);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete client");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 20, 30, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "var(--radius-md)",
          padding: 30,
          maxWidth: 440,
          width: "100%",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h2 className="sc-heading" style={{ fontSize: 20, marginBottom: 10 }}>Delete {fullName}?</h2>
        <p style={{ margin: "0 0 18px", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-500)" }}>
          This permanently deletes their account, documents, and message history. This cannot be undone.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          <span className="sc-eyebrow" style={{ fontSize: 10 }}>Type "{fullName}" to confirm</span>
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ fontFamily: "var(--font-body)", fontSize: 14, padding: "10px 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", outline: "none" }}
          />
          {trimmed.length > 0 && !matches && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--stone-500)" }}>
              Doesn't match "{fullName}" yet.
            </span>
          )}
        </label>
        {error && <div style={{ color: DANGER, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            style={{ background: DANGER, borderColor: DANGER }}
            disabled={!matches || saving}
            onClick={handleDelete}
          >
            {saving ? "Deleting…" : "Delete Client"}
          </Button>
        </div>
      </div>
    </div>
  );
}
