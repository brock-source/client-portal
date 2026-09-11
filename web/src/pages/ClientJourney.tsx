import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ChecklistItem, Phase1Category } from "../api/client";
import { PortalShell } from "../components/PortalShell";
import { Button, Badge } from "../components/ui";
import { CarrierPipeline, getCarrierPipelineDisplay } from "../components/CarrierPipeline";

function BackToDashboard() {
  const navigate = useNavigate();
  return (
    <span
      onClick={() => navigate("/dashboard")}
      style={{
        cursor: "pointer",
        display: "inline-block",
        fontFamily: "var(--font-label)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--navy-700)",
      }}
    >
      ← Back to dashboard
    </span>
  );
}

const PHASE_LABELS: Record<number, { roman: string; title: string; blurb: string }> = {
  1: { roman: "I", title: "Get on the Game Board", blurb: "Gather the paperwork so we can see the whole picture on paper." },
  2: { roman: "II", title: "Systemize Your Cash Flow", blurb: "Set up Currence so every dollar has a job before it lands." },
  3: { roman: "III", title: "Build Your Turbocharger", blurb: "Protection and leverage — application, underwriting, strategy meeting." },
  4: { roman: "IV", title: "Lock in Your Legacy", blurb: "Estate documents, drafted with our partner firm and filed with us." },
};

type Onboarding = Awaited<ReturnType<typeof api.client.onboarding>>;

export default function ClientJourney() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<number | null>(null);
  const hasInitializedOpenPhase = useRef(false);

  async function load() {
    try {
      const result = await api.client.onboarding();
      setData(result);
      if (!hasInitializedOpenPhase.current) {
        hasInitializedOpenPhase.current = true;
        const active = result.progress.find((p) => p.status === "IN_PROGRESS" && p.phase !== 4);
        setOpenPhase(active ? active.phase : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <PortalShell><div style={{ padding: 44 }}>{error}</div></PortalShell>;
  if (!data) return <PortalShell><div style={{ padding: 44 }}>Loading…</div></PortalShell>;

  if (data.allPhasesComplete && !data.client.welcomeSeenAt) {
    return (
      <PortalShell>
        <WelcomeScreen firstName={data.client.firstName} onContinue={async () => {
          await api.client.markWelcomeSeen();
          load();
        }} />
      </PortalShell>
    );
  }

  if (data.allPhasesComplete) {
    return (
      <PortalShell>
        <div className="sc-page" style={{ maxWidth: 700, paddingTop: 32, paddingBottom: 80, textAlign: "center" }}>
          <div style={{ textAlign: "left", marginBottom: 40 }}>
            <BackToDashboard />
          </div>
          <div className="sc-eyebrow" style={{ marginBottom: 16 }}>Onboarding complete</div>
          <h1 className="sc-heading" style={{ fontSize: 30, marginBottom: 16 }}>
            You're a StoneCentury Financial client
          </h1>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: "var(--text-body)" }}>
            Your document library, action items, and messages will live here as your relationship continues.
          </p>
        </div>
      </PortalShell>
    );
  }

  const uploadedCount = data.phase1Categories.filter((c) => c.uploaded).length;
  const totalCount = data.phase1Categories.length;
  const allUploaded = uploadedCount === totalCount;

  return (
    <PortalShell>
      <div style={{ background: "var(--paper-warm)", paddingTop: 32, paddingBottom: 60 }}>
        <div className="sc-page" style={{ maxWidth: 920 }}>
          <div style={{ marginBottom: 24 }}>
            <BackToDashboard />
          </div>
          <div style={{ textAlign: "center", marginBottom: 46 }}>
            <div className="sc-eyebrow" style={{ marginBottom: 16 }}>Your onboarding</div>
            <h1 className="sc-heading" style={{ fontSize: 36, marginBottom: 16 }}>
              Four phases to a<br />finished system
            </h1>
            <p style={{ margin: "0 auto", maxWidth: 520, fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.75, color: "var(--text-body)" }}>
              All four phases are open from day one — click a title to expand it and pick up wherever you like.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[1, 2, 3, 4].map((phase) => {
              const p = data.progress.find((x) => x.phase === phase)!;
              const info = PHASE_LABELS[phase];
              const isComplete = p.status === "COMPLETE";
              const isOpen = openPhase === phase;

              return (
                <div key={phase} style={{ display: "flex", gap: 26 }}>
                  <div style={{ width: 74, flex: "none", display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 600,
                        background: "var(--navy-700)",
                        color: "#fff",
                      }}
                    >
                      {isComplete ? "✓" : info.roman}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: isOpen ? "#fff" : "transparent",
                      border: isOpen ? "1px solid var(--border-subtle)" : "1px solid var(--stone-200)",
                      borderTop: isOpen ? "3px solid var(--gold-600)" : undefined,
                      boxShadow: isOpen ? "var(--shadow-lg)" : "none",
                      borderRadius: "var(--radius-md)",
                      padding: isOpen ? "28px 30px" : "24px 30px",
                      display: "flex",
                      alignItems: isOpen ? "stretch" : "center",
                      justifyContent: "space-between",
                      gap: 20,
                      flexDirection: isOpen ? "column" : "row",
                    }}
                  >
                    <div
                      style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, width: "100%" }}
                      onClick={() => setOpenPhase(isOpen ? null : phase)}
                    >
                      <div>
                        <div className="sc-eyebrow" style={{ fontSize: 10, color: isOpen ? "var(--gold-700)" : "var(--stone-700)", marginBottom: 8 }}>
                          Phase {["one", "two", "three", "four"][phase - 1]} {isComplete ? "· complete" : "· in progress"}
                        </div>
                        <h2 className="sc-heading" style={{ fontSize: isOpen ? 24 : 21, marginBottom: isOpen ? 12 : 8 }}>
                          {info.title}
                        </h2>
                        {!isOpen && (
                          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6, color: "var(--ink-500)" }}>
                            {info.blurb}
                          </p>
                        )}
                      </div>
                      <span
                        aria-hidden
                        style={{
                          flex: "none",
                          fontFamily: "var(--font-body)",
                          fontSize: 14,
                          color: "var(--stone-500)",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 150ms",
                        }}
                      >
                        ▾
                      </span>
                    </div>

                    {isOpen && phase === 1 && (
                      <Phase1Panel
                        data={data}
                        progressStatus={p.status}
                        onChange={load}
                        uploadedCount={uploadedCount}
                        totalCount={totalCount}
                        allUploaded={allUploaded}
                      />
                    )}
                    {isOpen && phase === 2 && (
                      <ChecklistPhasePanel
                        items={data.phase2Checklist}
                        phase={2}
                        progressStatus={p.status}
                        onChange={load}
                        intro="Five steps to get every dollar automated."
                        scheduleLabel="Schedule Activation Meeting"
                        scheduledLabel="Activation meeting scheduled"
                        readyForSchedule={(items) => items.filter((i) => i.sortOrder <= 2).every((i) => i.completed)}
                        readyHint="Complete the first two steps to unlock scheduling."
                      />
                    )}
                    {isOpen && phase === 3 && <Phase3Panel data={data} progressStatus={p.status} onChange={load} />}
                    {isOpen && phase === 4 && (
                      <div
                        style={{
                          border: "1px dashed var(--stone-300)",
                          borderRadius: "var(--radius-md)",
                          padding: "22px 24px",
                          fontFamily: "var(--font-body)",
                          fontSize: 15,
                          lineHeight: 1.6,
                          color: "var(--ink-500)",
                        }}
                      >
                        {isComplete
                          ? "Your legacy handoff is complete."
                          : "We're connecting you with our estate-planning partner firm. Your team will be in touch to finish locking in your legacy."}
                      </div>
                    )}

                    {!isOpen && isComplete && <Badge tone="success">Complete</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function WelcomeScreen({ firstName, onContinue }: { firstName: string; onContinue: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div
      style={{
        minHeight: "calc(100vh - 116px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--navy-800)",
        padding: 44,
      }}
    >
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <div className="sc-eyebrow" style={{ color: "var(--gold-500)", marginBottom: 18 }}>
          Onboarding complete
        </div>
        <h1 className="sc-heading" style={{ color: "#fff", fontSize: 36, marginBottom: 20 }}>
          Welcome to StoneCentury Financial, {firstName}
        </h1>
        <p style={{ margin: "0 0 30px", fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.8, color: "#d9dee5" }}>
          Every phase is complete — your paperwork is filed, your cash flow is systemized, your protection is in
          place, and your legacy is locked in. This is just the beginning of the relationship.
        </p>
        <Button
          variant="primary"
          arrow
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onContinue();
          }}
        >
          {submitting ? "Loading…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function ChecklistRow({
  label,
  completed,
  hint,
  pending,
  onMarkDone,
  onMarkIncomplete,
}: {
  label: string;
  completed: boolean;
  hint?: string | null;
  pending: boolean;
  onMarkDone?: () => void;
  onMarkIncomplete?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "16px 22px",
        background: completed ? "#fff" : "var(--paper-warm)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-label)",
          fontSize: 11,
          background: completed ? "var(--navy-700)" : "#fff",
          color: completed ? "#fff" : "transparent",
          border: completed ? "none" : "1px solid var(--stone-400)",
        }}
      >
        ✓
      </span>
      <div style={{ flex: "1 1 180px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--ink-700)" }}>{label}</div>
        {hint && !completed && (
          <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--stone-700)", marginTop: 4, letterSpacing: "0.08em" }}>
            {hint}
          </div>
        )}
      </div>
      {!completed && onMarkDone && (
        <Button variant="outline" style={{ padding: "8px 16px", fontSize: 11 }} disabled={pending} onClick={onMarkDone}>
          {pending ? "Saving…" : "Mark done"}
        </Button>
      )}
      {completed && onMarkIncomplete && (
        <Button variant="ghost" style={{ padding: "8px 16px", fontSize: 11 }} disabled={pending} onClick={onMarkIncomplete}>
          {pending ? "Saving…" : "Mark as incomplete"}
        </Button>
      )}
    </div>
  );
}

function ChecklistPhasePanel({
  items,
  phase,
  progressStatus,
  onChange,
  intro,
  scheduleLabel = "Schedule your next meeting",
  scheduledLabel = "Meeting scheduled — phase complete",
  readyForSchedule = (allItems) => allItems.every((i) => i.completed),
  readyHint,
}: {
  items: ChecklistItem[];
  phase: number;
  progressStatus: string;
  onChange: () => void;
  intro: string;
  scheduleLabel?: string;
  scheduledLabel?: string;
  readyForSchedule?: (items: ChecklistItem[]) => boolean;
  readyHint?: string;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.completed).length;
  const readyToSchedule = items.length > 0 && readyForSchedule(items);
  const alreadyScheduled = progressStatus === "COMPLETE";

  async function handleComplete(itemId: string) {
    setError(null);
    setPendingItemId(itemId);
    try {
      await api.client.completeChecklistItem(itemId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this step");
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleIncomplete(itemId: string) {
    setError(null);
    setPendingItemId(itemId);
    try {
      await api.client.uncompleteChecklistItem(itemId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this step");
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleSchedule() {
    setScheduling(true);
    try {
      await api.client.scheduleMeeting(phase);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: "var(--text-body)", maxWidth: 560 }}>
        {intro}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {items.map((i) => (
            <div key={i.id} style={{ flex: 1, height: 5, background: i.completed ? "var(--navy-700)" : "var(--stone-200)" }} />
          ))}
        </div>
        <span className="sc-eyebrow" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
          {completedCount} of {items.length}
        </span>
      </div>

      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 22 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
            <ChecklistRow
              label={item.label}
              completed={item.completed}
              pending={pendingItemId === item.id}
              onMarkDone={() => handleComplete(item.id)}
              onMarkIncomplete={() => handleIncomplete(item.id)}
            />
          </div>
        ))}
      </div>

      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {alreadyScheduled ? (
        <Badge tone="success">{scheduledLabel}</Badge>
      ) : readyToSchedule ? (
        <Button variant="primary" arrow onClick={handleSchedule} disabled={scheduling}>
          {scheduling ? "Scheduling…" : scheduleLabel}
        </Button>
      ) : (
        <div
          style={{
            border: "1px dashed var(--stone-300)",
            borderRadius: "var(--radius-md)",
            padding: "20px 22px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-500)",
          }}
        >
          {readyHint ?? `${items.length - completedCount} step(s) left to go.`}
        </div>
      )}
    </>
  );
}

function Phase3Panel({ data, progressStatus, onChange }: { data: Onboarding; progressStatus: string; onChange: () => void }) {
  const items = data.phase3Checklist;
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const application = items.find((i) => i.key === "application");
  const allComplete = items.length > 0 && items.every((i) => i.completed);
  const alreadyScheduled = progressStatus === "COMPLETE";

  const pipelineDisplay = getCarrierPipelineDisplay(items);
  const currentStep = pipelineDisplay.find((s) => !s.completed);

  async function toggleApplication(complete: boolean) {
    if (!application) return;
    setError(null);
    setPendingId(application.id);
    try {
      if (complete) await api.client.completeChecklistItem(application.id);
      else await api.client.uncompleteChecklistItem(application.id);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this step");
    } finally {
      setPendingId(null);
    }
  }

  async function handleSchedule() {
    setScheduling(true);
    try {
      await api.client.scheduleMeeting(3);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: "var(--text-body)", maxWidth: 560 }}>
        Start your application, then we'll track it through underwriting with the carrier.
      </p>

      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <ChecklistRow
          label="Complete your life insurance application"
          completed={!!application?.completed}
          pending={pendingId === application?.id}
          onMarkDone={() => toggleApplication(true)}
          onMarkIncomplete={() => toggleApplication(false)}
        />
      </div>

      <div className="sc-eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>
        Carrier pipeline
      </div>
      <div style={{ marginBottom: 22 }}>
        <CarrierPipeline items={items} />
      </div>

      {data.client.healthRating && (
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-700)",
            marginBottom: 18,
            padding: "10px 14px",
            background: "var(--paper-alt)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Health rating on file: <strong>{data.client.healthRating}</strong>
        </div>
      )}

      {error && <div style={{ color: "var(--error-600, #b33)", fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {alreadyScheduled ? (
        <Badge tone="success">Meeting scheduled — phase complete</Badge>
      ) : allComplete ? (
        <Button variant="primary" arrow onClick={handleSchedule} disabled={scheduling}>
          {scheduling ? "Scheduling…" : "Schedule your final strategy meeting"}
        </Button>
      ) : !application?.completed ? (
        <div
          style={{
            border: "1px dashed var(--stone-300)",
            borderRadius: "var(--radius-md)",
            padding: "20px 22px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-500)",
          }}
        >
          Submit your application to start the underwriting process.
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed var(--stone-300)",
            borderRadius: "var(--radius-md)",
            padding: "20px 22px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-500)",
          }}
        >
          Your team is tracking this with the carrier — currently at <strong>{currentStep?.label}</strong>.
        </div>
      )}
    </>
  );
}

function Phase1Panel({
  data,
  progressStatus,
  onChange,
  uploadedCount,
  totalCount,
  allUploaded,
}: {
  data: Onboarding;
  progressStatus: string;
  onChange: () => void;
  uploadedCount: number;
  totalCount: number;
  allUploaded: boolean;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const alreadyScheduled = progressStatus === "COMPLETE";

  async function handleFileChange(categoryId: string, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setPendingCategoryId(categoryId);
    try {
      await api.client.uploadDocument(categoryId, file);
      onChange();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPendingCategoryId(null);
    }
  }

  async function handleMarkMissing(categoryId: string) {
    setUploadError(null);
    setPendingCategoryId(categoryId);
    try {
      await api.client.markDocumentMissing(categoryId);
      onChange();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not update this category");
    } finally {
      setPendingCategoryId(null);
    }
  }

  async function handleSchedule() {
    setScheduling(true);
    try {
      await api.client.scheduleMeeting(1);
      onChange();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: "var(--text-body)", maxWidth: 560 }}>
        Eleven categories — upload what you have, we'll chase the rest.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {data.phase1Categories.map((c) => (
            <div key={c.id} style={{ flex: 1, height: 5, background: c.uploaded ? "var(--navy-700)" : c.missing ? "var(--gold-500)" : "var(--stone-200)" }} />
          ))}
        </div>
        <span className="sc-eyebrow" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
          {uploadedCount} of {totalCount} uploaded
        </span>
      </div>

      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 22 }}>
        {data.phase1Categories.map((c, i) => (
          <Phase1CategoryRow
            key={c.id}
            category={c}
            isLast={i === data.phase1Categories.length - 1}
            pending={pendingCategoryId === c.id}
            fileInputRef={(el) => (fileInputs.current[c.id] = el)}
            onFileSelected={(file) => handleFileChange(c.id, file)}
            onUploadClick={() => fileInputs.current[c.id]?.click()}
            onMarkMissing={() => handleMarkMissing(c.id)}
          />
        ))}
      </div>

      {uploadError && <div style={{ color: "var(--error-600, #b33)", fontSize: 14, marginBottom: 16 }}>{uploadError}</div>}

      {alreadyScheduled ? (
        <Badge tone="success">Meeting scheduled — phase complete</Badge>
      ) : allUploaded ? (
        <Button variant="primary" arrow onClick={handleSchedule} disabled={scheduling}>
          {scheduling ? "Scheduling…" : "Schedule your next meeting"}
        </Button>
      ) : (
        <div
          style={{
            border: "1px dashed var(--stone-300)",
            borderRadius: "var(--radius-md)",
            padding: "20px 22px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-500)",
          }}
        >
          Unlocks when all eleven categories are in. {totalCount - uploadedCount} to go.
        </div>
      )}
    </>
  );
}

function Phase1CategoryRow({
  category: c,
  isLast,
  pending,
  fileInputRef,
  onFileSelected,
  onUploadClick,
  onMarkMissing,
}: {
  category: Phase1Category;
  isLast: boolean;
  pending: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileSelected: (file: File | undefined) => void;
  onUploadClick: () => void;
  onMarkMissing: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "16px 22px",
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
        background: c.uploaded ? "#fff" : c.missing ? "var(--paper-alt)" : "var(--paper-warm)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-label)",
          fontSize: 11,
          background: c.uploaded ? "var(--navy-700)" : c.missing ? "var(--gold-500)" : "#fff",
          color: c.uploaded || c.missing ? "#fff" : "transparent",
          border: c.uploaded || c.missing ? "none" : "1px solid var(--stone-400)",
        }}
      >
        {c.uploaded ? "✓" : c.missing ? "!" : ""}
      </span>
      <div style={{ flex: "1 1 180px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--ink-700)" }}>{c.label}</div>
        {c.hint && !c.uploaded && !c.missing && (
          <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--stone-700)", marginTop: 4, letterSpacing: "0.08em" }}>
            {c.hint}
          </div>
        )}
        {c.missing && !c.uploaded && (
          <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--gold-700)", marginTop: 4, letterSpacing: "0.08em" }}>
            Marked as not available yet
          </div>
        )}
        {c.document && (
          <div className="sc-eyebrow" style={{ fontSize: 10, color: "var(--stone-500)", marginTop: 4, letterSpacing: "0.08em" }}>
            {c.document.filename}
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => onFileSelected(e.target.files?.[0])} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: "none" }}>
        {!c.uploaded && !c.missing && (
          <Button variant="ghost" style={{ padding: "8px 14px", fontSize: 11 }} disabled={pending} onClick={onMarkMissing}>
            I don't have it now
          </Button>
        )}
        <Button variant="outline" style={{ padding: "8px 16px", fontSize: 11 }} disabled={pending} onClick={onUploadClick}>
          {pending ? "Saving…" : c.uploaded ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
