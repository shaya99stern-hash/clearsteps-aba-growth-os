"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Check, ChevronRight, Mail, Plus, ShieldCheck, UserRoundCheck } from "lucide-react";
import { getServerCrmLeads, loadCrmLeads, subscribeCrmLeads, syncDurableCrmLeads } from "@/lib/crm/local-store";
import { prepareReferralRecipient, renderOutreachTemplate, type PreparedReferralRecipient } from "@/lib/outreach/model";
import { addOutreachSuppression, getServerOutreachWorkspace, loadOutreachWorkspace, saveOutreachDraft, subscribeOutreachWorkspace } from "@/lib/outreach/local-store";
import styles from "./OutreachWorkbench.module.css";

const PRESETS = [
  {
    id: "daycare",
    label: "Daycare / preschool",
    subject: "ABA referral support for families at {{organization}}",
    body: "Hello,\n\nI’m reaching out from Clear Steps ABA. We support families seeking ABA services in {{location}} and would be glad to make the referral process simple for your team.\n\nIf it would be useful, I can share our current service-area information and a direct referral pathway for families who ask your staff for ABA resources.\n\nBest,\nClear Steps ABA",
  },
  {
    id: "evaluator",
    label: "Psychologist / evaluator",
    subject: "A simple ABA referral pathway for families you evaluate",
    body: "Hello,\n\nI’m reaching out from Clear Steps ABA. We work with families in {{location}} who are looking for ABA services after an evaluation or recommendation.\n\nI’d like to make it easy for your office to share a direct, current referral option when families ask what to do next. No child-specific or protected health information is needed by email.\n\nBest,\nClear Steps ABA",
  },
  {
    id: "therapy",
    label: "Speech / OT partner",
    subject: "Referral coordination with Clear Steps ABA",
    body: "Hello,\n\nI’m reaching out from Clear Steps ABA about referral coordination in {{location}}. We’d be happy to serve as a reliable ABA resource when families at {{organization}} ask about behavioral support.\n\nIf helpful, I can send a short overview of our referral process and current service coverage.\n\nBest,\nClear Steps ABA",
  },
  {
    id: "general",
    label: "General referral partner",
    subject: "Clear Steps ABA referral resource for {{organization}}",
    body: "Hello,\n\nI’m reaching out from Clear Steps ABA. We support families in {{location}} and are building strong referral relationships with local organizations and professionals.\n\nI’d be glad to share a concise referral pathway and current service information for families who ask your team about ABA support.\n\nBest,\nClear Steps ABA",
  },
] as const;

export function OutreachWorkbench() {
  const crmLeads = useSyncExternalStore(subscribeCrmLeads, loadCrmLeads, getServerCrmLeads);
  const workspace = useSyncExternalStore(subscribeOutreachWorkspace, loadOutreachWorkspace, getServerOutreachWorkspace);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignName, setCampaignName] = useState("Referral partner outreach");
  const [presetId, setPresetId] = useState<(typeof PRESETS)[number]["id"]>(PRESETS[0].id);
  const [subject, setSubject] = useState<string>(PRESETS[0].subject);
  const [body, setBody] = useState<string>(PRESETS[0].body);
  const [reviewed, setReviewed] = useState(false);
  const [suppressionEmail, setSuppressionEmail] = useState("");

  useEffect(() => {
    void syncDurableCrmLeads();
  }, []);

  const suppressions = useMemo(() => new Set(workspace.suppressions), [workspace.suppressions]);
  const readyRecipients = useMemo(
    () => crmLeads.map((lead) => prepareReferralRecipient(lead, suppressions)).filter(isPreparedRecipient),
    [crmLeads, suppressions],
  );
  const unsuppressedCheck = useMemo(
    () => crmLeads.map((lead) => prepareReferralRecipient(lead, new Set<string>())).filter(isPreparedRecipient),
    [crmLeads],
  );
  const suppressedCount = Math.max(0, unsuppressedCheck.length - readyRecipients.length);
  const selectedRecipients = readyRecipients.filter((recipient) => selectedIds.has(recipient.entityId));
  const previewRecipient = selectedRecipients[0] ?? readyRecipients[0];

  function choosePreset(id: (typeof PRESETS)[number]["id"]) {
    const preset = PRESETS.find((item) => item.id === id) ?? PRESETS[0];
    setPresetId(preset.id);
    setSubject(preset.subject);
    setBody(preset.body);
    setReviewed(false);
  }

  function toggleRecipient(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setReviewed(false);
  }

  function selectAllReady() {
    setSelectedIds(new Set(readyRecipients.map((recipient) => recipient.entityId)));
    setReviewed(false);
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validRecipientIds = selectedRecipients.map((recipient) => recipient.entityId);
    if (!reviewed || validRecipientIds.length === 0 || !subject.trim() || !body.trim()) return;
    saveOutreachDraft({
      name: campaignName,
      subject,
      body,
      recipientIds: validRecipientIds,
      reviewed: true,
    });
    setReviewed(false);
  }

  function suppress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addOutreachSuppression(suppressionEmail);
    setSuppressionEmail("");
    setReviewed(false);
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.policyStrip}>
        <ShieldCheck size={17} />
        <div>
          <strong>Review-only outreach</strong>
          <span>Organization/professional referral contacts only. No PHI. Suppressions always win. Sending is not enabled in this phase.</span>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Outreach readiness summary">
        <div><span>CRM records</span><strong>{crmLeads.length}</strong></div>
        <div><span>Outreach-ready</span><strong>{readyRecipients.length}</strong></div>
        <div><span>Selected</span><strong>{selectedRecipients.length}</strong></div>
        <div><span>Suppressed</span><strong>{suppressedCount}</strong></div>
      </section>

      <div className={styles.layout}>
        <section className={styles.recipientPanel}>
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Segment</span>
              <h2>Referral recipients</h2>
            </div>
            <button type="button" onClick={selectAllReady} disabled={readyRecipients.length === 0}>Select ready</button>
          </header>

          <div className={styles.recipientList}>
            {readyRecipients.map((recipient) => {
              const selected = selectedIds.has(recipient.entityId);
              return (
                <button
                  type="button"
                  className={`${styles.recipient} ${selected ? styles.selected : ""}`}
                  key={recipient.entityId}
                  onClick={() => toggleRecipient(recipient.entityId)}
                  aria-pressed={selected}
                >
                  <span className={styles.check}>{selected && <Check size={13} />}</span>
                  <span className={styles.recipientText}>
                    <strong>{recipient.name}</strong>
                    <small>{recipient.email}{recipient.location ? ` · ${recipient.location}` : ""}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
            {readyRecipients.length === 0 && (
              <div className={styles.emptyPanel}>
                <UserRoundCheck size={20} />
                <strong>No outreach-ready referral records yet</strong>
                <span>Move evidence-backed referral records to Qualified or later and make sure a public email is available.</span>
              </div>
            )}
          </div>

          <form className={styles.suppressionForm} onSubmit={suppress}>
            <label>
              <span>Suppress an email</span>
              <input
                value={suppressionEmail}
                onChange={(event) => setSuppressionEmail(event.target.value)}
                type="email"
                placeholder="name@example.com"
              />
            </label>
            <button type="submit" disabled={!suppressionEmail.trim()}><Plus size={14} /> Suppress</button>
          </form>
          {workspace.suppressions.length > 0 && (
            <div className={styles.suppressionList}>
              {workspace.suppressions.slice(0, 5).map((email) => <span key={email}>{email}</span>)}
            </div>
          )}
        </section>

        <form className={styles.composer} onSubmit={saveDraft}>
          <div className={styles.composerHeader}>
            <div>
              <span className={styles.eyebrow}>Campaign draft</span>
              <h2>Prepare the message</h2>
            </div>
            <Mail size={20} />
          </div>

          <label className={styles.field}>
            <span>Campaign name</span>
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} maxLength={200} />
          </label>
          <label className={styles.field}>
            <span>Template</span>
            <select value={presetId} onChange={(event) => choosePreset(event.target.value as (typeof PRESETS)[number]["id"])}>
              {PRESETS.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Subject</span>
            <input value={subject} onChange={(event) => { setSubject(event.target.value); setReviewed(false); }} maxLength={240} />
          </label>
          <label className={styles.field}>
            <span>Body</span>
            <textarea value={body} onChange={(event) => { setBody(event.target.value); setReviewed(false); }} rows={10} maxLength={8000} />
          </label>
          <p className={styles.tokenHint}>Available tokens: <code>{"{{organization}}"}</code> <code>{"{{location}}"}</code> <code>{"{{email}}"}</code></p>

          <div className={styles.preview}>
            <span className={styles.eyebrow}>Personalized preview</span>
            {previewRecipient ? (
              <>
                <strong>{renderOutreachTemplate(subject, previewRecipient)}</strong>
                <pre>{renderOutreachTemplate(body, previewRecipient)}</pre>
              </>
            ) : (
              <p>Select an outreach-ready CRM record to preview personalization.</p>
            )}
          </div>

          <label className={styles.reviewCheck}>
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            <span>I reviewed this as organization-level outreach, confirmed the selected recipients, and included no child-specific or protected health information.</span>
          </label>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={!reviewed || selectedRecipients.length === 0 || !subject.trim() || !body.trim()}
          >
            <ShieldCheck size={15} /> Save reviewed draft · {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"}
          </button>
        </form>
      </div>

      <section className={styles.savedDrafts}>
        <header className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Saved locally</span>
            <h2>Reviewed campaign drafts</h2>
          </div>
          <strong>{workspace.drafts.length}</strong>
        </header>
        <div className={styles.draftGrid}>
          {workspace.drafts.map((draft) => (
            <article key={draft.id}>
              <span>{draft.status === "reviewed" ? "Reviewed" : "Needs review"}</span>
              <h3>{draft.name}</h3>
              <p>{draft.subject}</p>
              <small>{draft.recipientIds.length} recipient{draft.recipientIds.length === 1 ? "" : "s"}</small>
            </article>
          ))}
          {workspace.drafts.length === 0 && <div className={styles.emptyDrafts}>No reviewed drafts saved yet.</div>}
        </div>
      </section>
    </div>
  );
}

function isPreparedRecipient(value: PreparedReferralRecipient | null): value is PreparedReferralRecipient {
  return value !== null;
}
