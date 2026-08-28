"use client";

import { normalizeOutreachEmail } from "@/lib/outreach/model";

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
  return draft;
}

export function addOutreachSuppression(value: string) {
  const normalized = normalizeOutreachEmail(value);
  if (!normalized || !normalized.includes("@")) return loadOutreachWorkspace();
  const current = loadOutreachWorkspace();
  if (current.suppressions.includes(normalized)) return current;
  const next = { ...current, suppressions: [normalized, ...current.suppressions] };
  writeState(next);
  return next;
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
