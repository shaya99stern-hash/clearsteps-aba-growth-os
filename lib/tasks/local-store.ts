"use client";

import { reconcileTimestampedRecords } from "@/lib/sync/reconcile";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/model";

export interface SavedTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueAt?: string;
  entityType?: string;
  entityId?: string;
}

const STORAGE_KEY = "clearsteps.tasks.v1";
const CHANGE_EVENT = "clearsteps:tasks-change";
const EMPTY_TASKS: SavedTask[] = [];
let cachedRaw: string | undefined;
let cachedTasks: SavedTask[] = EMPTY_TASKS;
let syncInFlight: Promise<void> | null = null;

export function loadTasks(): SavedTask[] {
  if (typeof window === "undefined") return EMPTY_TASKS;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedTasks;
  try {
    const parsed = JSON.parse(raw);
    cachedTasks = Array.isArray(parsed) ? parsed.filter(isSavedTask) : EMPTY_TASKS;
  } catch {
    cachedTasks = EMPTY_TASKS;
  }
  cachedRaw = raw;
  return cachedTasks;
}

export function getServerTasks(): SavedTask[] {
  return EMPTY_TASKS;
}

export function subscribeTasks(onStoreChange: () => void) {
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

export function createTask(input: CreateTaskInput): SavedTask {
  const now = new Date().toISOString();
  const task: SavedTask = {
    id: createId(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    status: "open",
    priority: input.priority,
    dueAt: input.dueAt,
    entityType: input.entityType,
    entityId: input.entityId,
    createdAt: now,
    updatedAt: now,
  };
  if (!task.title) throw new Error("Task title is required.");
  writeTasks([task, ...loadTasks()]);
  void persistTask(task);
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus) {
  const now = new Date().toISOString();
  const next = loadTasks().map((task) => task.id === id ? { ...task, status, updatedAt: now } : task);
  writeTasks(next);
  void persistStatus(id, status);
  return next;
}

export function syncDurableTasks() {
  if (typeof window === "undefined") return Promise.resolve();
  if (syncInFlight) return syncInFlight;
  syncInFlight = reconcileDurableTasks().finally(() => { syncInFlight = null; });
  return syncInFlight;
}

async function reconcileDurableTasks() {
  try {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json() as { tasks?: unknown };
    if (!Array.isArray(json.tasks)) return;
    const durable = json.tasks.filter(isSavedTask);
    const result = reconcileTimestampedRecords(loadTasks(), durable);
    writeTasks(result.merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
    await Promise.allSettled(result.backfill.map((task) => persistTask(task)));
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

async function persistTask(task: SavedTask) {
  try {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(task),
      keepalive: true,
    });
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

async function persistStatus(id: string, status: TaskStatus) {
  try {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
      keepalive: true,
    });
  } catch {
    // Browser storage remains the operational fallback until a later sync.
  }
}

function writeTasks(tasks: SavedTask[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(tasks);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedTasks = tasks;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSavedTask(value: unknown): value is SavedTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<SavedTask>;
  return typeof task.id === "string"
    && typeof task.title === "string"
    && typeof task.description === "string"
    && ["open", "in_progress", "done"].includes(String(task.status))
    && ["low", "normal", "high", "urgent"].includes(String(task.priority))
    && typeof task.createdAt === "string"
    && typeof task.updatedAt === "string"
    && (task.dueAt === undefined || typeof task.dueAt === "string")
    && (task.entityType === undefined || typeof task.entityType === "string")
    && (task.entityId === undefined || typeof task.entityId === "string");
}
