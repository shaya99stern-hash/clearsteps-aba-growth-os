import { getPrisma } from "@/lib/db/prisma";
import { type TaskInput, type TaskStatus } from "@/lib/tasks/model";

export { taskInputSchema } from "@/lib/tasks/model";
export type { TaskInput } from "@/lib/tasks/model";

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

export async function updateDurableTaskStatus(id: string, status: TaskStatus) {
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
