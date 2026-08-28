import { z } from "zod";

export const TASK_STATUSES = ["open", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const taskInputSchema = z.object({
  id: z.string().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4_000).optional().default(""),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueAt: z.string().datetime().optional(),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(300).optional(),
  createdAt: z.string().datetime().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === "open") return "in_progress";
  if (status === "in_progress") return "done";
  return "done";
}
