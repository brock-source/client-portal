import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { PortalShell } from "../components/PortalShell";
import { Button, Badge } from "../components/ui";

type Clients = Awaited<ReturnType<typeof api.admin.listClients>>;

const ROW_COLUMNS = "2fr 2fr 1fr 1.5fr";

export default function AdminClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Clients | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | 1 | 2 | 3 | 4>("all");

  async function load() {
    try {
      setClients(await api.admin.listClients());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredClients = useMemo(() => {
    if (!clients) return null;
    const query = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !query || c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
      const matchesPhase = phaseFilter === "all" || c.currentPhase === phaseFilter;
      return matchesSearch && matchesPhase;
    });
  }, [clients, search, phaseFilter]);

  return (
    <PortalShell>
      <div className="sc-page" style={{ maxWidth: 1140, paddingTop: 44, paddingBottom: 44 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 30 }}>
          <h1 className="sc-heading" style={{ fontSize: 28 }}>Clients</h1>
          <Button variant="primary" onClick={() => setShowAdd(true)}>+ Add client</Button>
        </div>

        {error && <div style={{ color: "var(--error-600, #b33)", marginBottom: 16 }}>{error}</div>}

        {showAdd && (
          <AddClientForm
            onDone={() => {
              setShowAdd(false);
              load();
            }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 200px",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              padding: "10px 14px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              outline: "none",
              background: "#fff",
            }}
          />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value === "all" ? "all" : (Number(e.target.value) as 1 | 2 | 3 | 4))}
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "10px 14px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              outline: "none",
              background: "#fff",
              color: "var(--navy-800)",
            }}
          >
            <option value="all">All phases</option>
            <option value={1}>Phase 1</option>
            <option value={2}>Phase 2</option>
            <option value={3}>Phase 3</option>
            <option value={4}>Phase 4</option>
          </select>
        </div>

        <div className="sc-table-scroll" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "#fff" }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, columnGap: 20, padding: "14px 22px", background: "var(--paper-alt)", fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--stone-700)" }}>
              <span>Name</span>
              <span>Email</span>
              <span>Phase</span>
              <span>Current step</span>
            </div>
            {filteredClients?.length === 0 && (
              <div style={{ padding: 22, fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
                {clients?.length === 0 ? "No clients yet." : "No clients match your search."}
              </div>
            )}
            {filteredClients?.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/admin/clients/${c.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: ROW_COLUMNS,
                  columnGap: 20,
                  alignItems: "center",
                  padding: "16px 22px",
                  borderTop: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--navy-700)" }}>
                  {c.name}
                  {c.unreadMessageCount > 0 && <Badge tone="navy">{c.unreadMessageCount} new</Badge>}
                  {c.healthRating && <Badge tone="gold">{c.healthRating}</Badge>}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>{c.email}</span>
                <span style={{ justifySelf: "start" }}>
                  <Badge tone={c.currentPhase === 4 ? "success" : "gold"}>Phase {c.currentPhase}</Badge>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)" }}>
                  {c.currentStepLabel}
                  {c.phase1MissingCount > 0 && (
                    <Badge tone="gold">{c.phase1MissingCount} missing</Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function AddClientForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.admin.addClient({ firstName, lastName, email, phone: phone || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        background: "#fff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: 24,
        marginBottom: 24,
      }}
    >
      <Field label="First name" value={firstName} onChange={setFirstName} required />
      <Field label="Last name" value={lastName} onChange={setLastName} required />
      <Field label="Email" type="email" value={email} onChange={setEmail} required />
      <Field label="Phone (optional)" value={phone} onChange={setPhone} />
      {error && <div style={{ gridColumn: "1 / -1", color: "var(--error-600, #b33)" }}>{error}</div>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Sending invite…" : "Send invite"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="sc-eyebrow" style={{ fontSize: 10 }}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          padding: "10px 12px",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          outline: "none",
        }}
      />
    </label>
  );
}
