import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";

export const taskInputSchema = z.object({
  id: z.string().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4_000).optional().default(""),
  status: z.enum(["open", "in_progress", "done"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.string().datetime().optional(),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(300).optional(),
  createdAt: z.string().datetime().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export async function listDurableTasks() {
  const prisma = getPrisma();
  if (!prisma) return null;
  const rows = await prisma.task.findMany({ orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }], take: 1_000 });
  return rows.map(toTask);
}

export async function upsertDurableTask(input: TaskInput) {
  const prisma = getPrisma();
  if (!prisma) return null;
  const row = await prisma.task.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
    },
    update: {
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
    },
  });
  return toTask(row);
}

export async function updateDurableTaskStatus(id: string, status: "open" | "in_progress" | "done") {
  const prisma = getPrisma();
  if (!prisma) return null;
  return toTask(await prisma.task.update({ where: { id }, data: { status } }));
}

function toTask(row: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt?.toISOString(),
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
