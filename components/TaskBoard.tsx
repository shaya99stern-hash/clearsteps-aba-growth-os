"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, CalendarDays, Check, Circle, Clock3, Link2, Plus } from "lucide-react";
import { getServerCrmLeads, loadCrmLeads, subscribeCrmLeads, syncDurableCrmLeads } from "@/lib/crm/local-store";
import { nextTaskStatus, type TaskPriority, type TaskStatus } from "@/lib/tasks/model";
import { createTask, getServerTasks, loadTasks, subscribeTasks, syncDurableTasks, updateTaskStatus, type SavedTask } from "@/lib/tasks/local-store";
import styles from "./TaskBoard.module.css";

const COLUMNS: Array<{ status: TaskStatus; label: string; icon: typeof Circle }> = [
  { status: "open", label: "Open", icon: Circle },
  { status: "in_progress", label: "In progress", icon: Clock3 },
  { status: "done", label: "Done", icon: Check },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function TaskBoard() {
  const tasks = useSyncExternalStore(subscribeTasks, loadTasks, getServerTasks);
  const crmLeads = useSyncExternalStore(subscribeCrmLeads, loadCrmLeads, getServerCrmLeads);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueAt, setDueAt] = useState("");
  const [linkedLeadId, setLinkedLeadId] = useState("");

  useEffect(() => {
    void syncDurableTasks();
    void syncDurableCrmLeads();
  }, []);

  const leadById = useMemo(() => new Map(crmLeads.map((lead) => [lead.id, lead])), [crmLeads]);
  const openCount = tasks.filter((task) => task.status === "open").length;
  const activeCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter((task) => task.status !== "done" && task.dueAt && Date.parse(task.dueAt) < Date.now()).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const linkedLead = linkedLeadId ? leadById.get(linkedLeadId) : undefined;
    createTask({
      title,
      description,
      priority,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      entityType: linkedLead?.kind,
      entityId: linkedLead?.id,
    });
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueAt("");
    setLinkedLeadId("");
  }

  function advance(task: SavedTask) {
    updateTaskStatus(task.id, nextTaskStatus(task.status));
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.summaryStrip} aria-label="Task summary">
        <div><span>Open</span><strong>{openCount}</strong></div>
        <div><span>In progress</span><strong>{activeCount}</strong></div>
        <div><span>Overdue</span><strong>{overdueCount}</strong></div>
        <div><span>Total</span><strong>{tasks.length}</strong></div>
      </section>

      <form className={styles.composer} onSubmit={submit}>
        <div className={styles.composerLead}>
          <div className={styles.composerIcon}><Plus size={18} /></div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an operational task…"
            aria-label="Task title"
            maxLength={300}
            required
          />
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context, next step, or handoff note"
          aria-label="Task description"
          maxLength={4000}
          rows={2}
        />
        <div className={styles.composerMeta}>
          <label>
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            <span>Due</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <label className={styles.linkField}>
            <span>Link CRM record</span>
            <select value={linkedLeadId} onChange={(event) => setLinkedLeadId(event.target.value)}>
              <option value="">Unlinked</option>
              {crmLeads.map((lead) => (
                <option value={lead.id} key={lead.id}>{lead.name} · {lead.pipeline}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.addButton} disabled={!title.trim()}>
            <Plus size={15} /> Add task
          </button>
        </div>
      </form>

      <div className={styles.boardScroller}>
        <div className={styles.board}>
          {COLUMNS.map((column) => {
            const Icon = column.icon;
            const columnTasks = tasks
              .filter((task) => task.status === column.status)
              .sort(compareTasks);
            return (
              <section className={styles.column} key={column.status}>
                <header className={styles.columnHeader}>
                  <span><Icon size={14} /> {column.label}</span>
                  <b>{columnTasks.length}</b>
                </header>
                <div className={styles.cards}>
                  {columnTasks.map((task) => {
                    const linkedLead = task.entityId ? leadById.get(task.entityId) : undefined;
                    const isOverdue = task.status !== "done" && Boolean(task.dueAt) && Date.parse(task.dueAt as string) < Date.now();
                    return (
                      <article className={styles.card} key={task.id}>
                        <div className={styles.cardTopline}>
                          <span className={`${styles.priority} ${styles[`priority_${task.priority}`]}`}>{task.priority}</span>
                          {isOverdue && <span className={styles.overdue}>Overdue</span>}
                        </div>
                        <h3>{task.title}</h3>
                        {task.description && <p>{task.description}</p>}
                        <div className={styles.metaList}>
                          {task.dueAt && <span><CalendarDays size={13} /> {formatDue(task.dueAt)}</span>}
                          {linkedLead && <span><Link2 size={13} /> {linkedLead.name}</span>}
                        </div>
                        <div className={styles.cardFooter}>
                          <span>{task.updatedAt ? `Updated ${formatRelative(task.updatedAt)}` : "Local task"}</span>
                          <button type="button" onClick={() => advance(task)} disabled={task.status === "done"}>
                            {task.status === "done" ? <><Check size={14} /> Complete</> : <><ArrowRight size={14} /> {task.status === "open" ? "Start" : "Complete"}</>}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className={styles.emptyColumn}>
                      <span>{column.status === "done" ? "Completed work lands here." : "No tasks in this stage."}</span>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function compareTasks(a: SavedTask, b: SavedTask) {
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;
  const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
  const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function formatDue(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
