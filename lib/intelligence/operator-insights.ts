import type { SavedCrmLead } from "@/lib/crm/local-store";
import type { SavedTask } from "@/lib/tasks/local-store";
import { evidencePosture, latestTerritoryRuns, type ScoutRun } from "./scout-history";

export type NextAction = {
  id: string;
  kind: "overdue" | "crm" | "territory";
  title: string;
  detail: string;
  href: string;
  priority: number;
  leadId?: string;
  leadKind?: string;
};

export type OperatorSummary = {
  overdue: number;
  unfinished: number;
  referralLeads: number;
  talentLeads: number;
  savedTerritories: number;
  evidenceToReview: number;
};

export function operatorSummary(
  runs: readonly ScoutRun[],
  leads: readonly SavedCrmLead[],
  tasks: readonly SavedTask[],
  now: number,
): OperatorSummary {
  const latest = latestTerritoryRuns(runs);
  return {
    overdue: tasks.filter((task) => overdue(task, now)).length,
    unfinished: tasks.filter((task) => task.status !== "done").length,
    referralLeads: leads.filter((lead) => lead.pipeline === "referral").length,
    talentLeads: leads.filter((lead) => lead.pipeline === "talent").length,
    savedTerritories: latest.length,
    evidenceToReview: latest.filter((run) => evidencePosture(run, now) !== "review").length,
  };
}

export function buildOperatorQueue(
  runs: readonly ScoutRun[],
  leads: readonly SavedCrmLead[],
  tasks: readonly SavedTask[],
  now: number,
): NextAction[] {
  const queue: NextAction[] = [];
  const linked = new Set(tasks.filter((task) => task.status !== "done").map((task) => task.entityId).filter(Boolean));
  for (const task of tasks.filter((item) => overdue(item, now))) {
    queue.push({
      id: "task:" + task.id,
      kind: "overdue",
      title: task.title,
      detail: "Overdue " + task.priority + "-priority task. Review its owner, due date and next step.",
      href: "/tasks",
      priority: task.priority === "urgent" ? 110 : 100,
    });
  }
  for (const lead of leads) {
    if (linked.has(lead.id) || lead.score < 65 || lead.confidence < 60) continue;
    if (["Referral Received", "Hired"].includes(lead.stage)) continue;
    queue.push({
      id: "lead:" + lead.id,
      kind: "crm",
      title: "Review " + lead.name,
      detail: lead.pipeline === "talent"
        ? "Recruiting signal · " + lead.score + "/100 score · " + lead.confidence + "% confidence. Verify source and credentials before outreach."
        : "Referral opportunity · " + lead.score + "/100 score · " + lead.confidence + "% confidence. Review fit and evidence before outreach.",
      href: lead.pipeline === "talent" ? "/talent" : "/pipeline",
      priority: 60 + Math.round(lead.score / 10),
      leadId: lead.id,
      leadKind: lead.kind,
    });
  }
  for (const run of latestTerritoryRuns(runs)) {
    if (evidencePosture(run, now) === "review" && run.score < 65) continue;
    const posture = evidencePosture(run, now);
    queue.push({
      id: "territory:" + run.id,
      kind: "territory",
      title: run.location + " · " + run.engine.toUpperCase(),
      detail: posture === "review"
        ? "Score " + run.score + "/100 with " + run.coverage + "% model coverage. Validate before committing resources."
        : posture === "stale"
          ? "Saved research is over 30 days old. Refresh before making decisions."
          : "Insufficient evidence: " + run.coverage + "% coverage and " + run.confidence + "% confidence. Research more sources.",
      href: "/?state=" + run.state + "&engine=" + run.engine + "&location=" + encodeURIComponent(run.location) + "&query=" + encodeURIComponent(run.query),
      priority: posture === "stale" ? 35 : posture === "thin" ? 50 : 55 + Math.round(run.score / 10),
    });
  }
  return queue.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title)).slice(0, 12);
}

function overdue(task: SavedTask, now: number) {
  return task.status !== "done" && Boolean(task.dueAt) && Number.isFinite(Date.parse(task.dueAt as string)) && Date.parse(task.dueAt as string) < now;
}
