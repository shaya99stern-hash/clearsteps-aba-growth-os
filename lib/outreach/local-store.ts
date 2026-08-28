"use client";

import { normalizeOutreachEmail } from "@/lib/outreach/model";
import { reconcileTimestampedRecords } from "@/lib/sync/reconcile";

export type OutreachDraftStatus = "needs_review" | "reviewed";

export interface SavedOutreachDraft {
  id: string;
  name: string;
  subject: string;
  body: string;
  recipientIds: string[];
  status: OutreachDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachWorkspaceState {
  drafts: SavedOutreachDraft[];
  suppressions: string[];
}

export interface SaveOutreachDraftInput {
  id?: string;
  name: string;
  subject: string;
  body: string;
  recipientIds: string[];
  reviewed: boolean;
}

const STORAGE_KEY = "clearsteps.outreach.workspace.v1";
const CHANGE_EVENT = "clearsteps:outreach-change";
const EMPTY_STATE: OutreachWorkspaceState = { drafts: [], suppressions: [] };
let cachedRaw: string | undefined;
let cachedState: OutreachWorkspaceState = EMPTY_STATE;
let syncInFlight: Promise<void> | null = null;

export function loadOutreachWorkspace(): OutreachWorkspaceState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === cachedRaw) return cachedState;
  if (!raw) {
    cachedRaw = raw;
    cachedState = EMPTY_STATE;
    return cachedState;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OutreachWorkspaceState>;
    cachedState = {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts.filter(isSavedDraft) : [],
      suppressions: Array.isArray(parsed.suppressions)
        ? Array.from(new Set(parsed.suppressions.filter((value): value is string => typeof value === "string").map(normalizeOutreachEmail))).filter(Boolean)
        : [],
    };
  } catch {
    cachedState = EMPTY_STATE;
  }
  cachedRaw = raw;
  return cachedState;
}

export function getServerOutreachWorkspace(): OutreachWorkspaceState {
  return EMPTY_STATE;
}

export function subscribeOutreachWorkspace(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function saveOutreachDraft(input: SaveOutreachDraftInput) {
  const current = loadOutreachWorkspace();
  const existing = input.id ? current.drafts.find((draft) => draft.id === input.id) : undefined;
  const now = new Date().toISOString();
  const draft: SavedOutreachDraft = {
    id: existing?.id ?? createId(),
    name: input.name.trim() || "Referral outreach draft",
    subject: input.subject.trim(),
    body: input.body.trim(),
    recipientIds: Array.from(new Set(input.recipientIds)),
    status: input.reviewed ? "reviewed" : "needs_review",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const drafts = [draft, ...current.drafts.filter((item) => item.id !== draft.id)];
  writeState({ ...current, drafts });
  if (draft.status === "reviewed") void persistDraft(draft);
  return draft;
}

export function addOutreachSuppression(value: string) {
  const normalized = normalizeOutreachEmail(value);
  if (!normalized || !normalized.includes("@")) return loadOutreachWorkspace();
  const current = loadOutreachWorkspace();
  if (current.suppressions.includes(normalized)) return current;
  const next = { ...current, suppressions: [normalized, ...current.suppressions] };
  writeState(next);
  void persistSuppression(normalized);
  return next;
}

export function syncDurableOutreachWorkspace() {
  if (typeof window === "undefined") return Promise.resolve();
  if (syncInFlight) return syncInFlight;
  syncInFlight = reconcileDurableOutreachWorkspace().finally(() => { syncInFlight = null; });
  return syncInFlight;
}

async function reconcileDurableOutreachWorkspace() {
  try {
    const response = await fetch("/api/outreach/workspace", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json() as { workspace?: unknown };
    if (!json.workspace || typeof json.workspace !== "object") return;
    const durable = json.workspace as Partial<OutreachWorkspaceState>;
    const durableDrafts = Array.isArray(durable.drafts) ? durable.drafts.filter(isSavedDraft) : [];
    const durableSuppressions = Array.isArray(durable.suppressions)
      ? durable.suppressions.filter((value): value is string => typeof value === "string").map(normalizeOutreachEmail).filter(Boolean)
      : [];
    const current = loadOutreachWorkspace();
    const draftResult = reconcileTimestampedRecords(current.drafts, durableDrafts);
    const durableSuppressionSet = new Set(durableSuppressions);
    const suppressionsToBackfill = current.suppressions.filter((email) => !durableSuppressionSet.has(email));

    writeState({
      drafts: draftResult.merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      suppressions: Array.from(new Set([...current.suppressions, ...durableSuppressions])),
    });

    await Promise.allSettled([
      ...draftResult.backfill.filter((draft) => draft.status === "reviewed").map((draft) => persistDraft(draft)),
      ...suppressionsToBackfill.map((email) => persistSuppression(email)),
    ]);
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

async function persistDraft(draft: SavedOutreachDraft) {
  try {
    const response = await fetch("/api/outreach/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "save_draft",
        draft: {
          id: draft.id,
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
          recipientIds: draft.recipientIds,
          reviewed: true,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      }),
      keepalive: true,
    });
    if (response.status === 400) {
      markDraftNeedsReview(draft.id);
      return;
    }
    if (!response.ok) return;
    const json = await response.json() as { draft?: unknown };
    const durableDraft = json.draft;
    if (!isSavedDraft(durableDraft)) return;
    const current = loadOutreachWorkspace();
    writeState({ ...current, drafts: [durableDraft, ...current.drafts.filter((item) => item.id !== durableDraft.id)] });
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

async function persistSuppression(email: string) {
  try {
    await fetch("/api/outreach/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "suppress", suppression: { email } }),
      keepalive: true,
    });
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

function markDraftNeedsReview(id: string) {
  const current = loadOutreachWorkspace();
  const now = new Date().toISOString();
  writeState({
    ...current,
    drafts: current.drafts.map((draft) => draft.id === id ? { ...draft, status: "needs_review", updatedAt: now } : draft),
  });
}

function writeState(state: OutreachWorkspaceState) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedState = state;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSavedDraft(value: unknown): value is SavedOutreachDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<SavedOutreachDraft>;
  return typeof draft.id === "string"
    && typeof draft.name === "string"
    && typeof draft.subject === "string"
    && typeof draft.body === "string"
    && Array.isArray(draft.recipientIds)
    && draft.recipientIds.every((id) => typeof id === "string")
    && (draft.status === "needs_review" || draft.status === "reviewed")
    && typeof draft.createdAt === "string"
    && typeof draft.updatedAt === "string";
}
