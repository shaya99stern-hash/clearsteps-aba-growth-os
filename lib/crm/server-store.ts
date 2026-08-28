import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";

const evidenceSchema = z.object({
  id: z.string().max(300),
  sourceId: z.string().max(120),
  title: z.string().max(1_000),
  url: z.string().url().max(4_000),
  snippet: z.string().max(8_000),
  query: z.string().max(2_000),
  capturedAt: z.string().max(80),
  purpose: z.enum(["discover", "enrich", "verify", "monitor"]),
  geography: z.string().max(300).optional(),
});

export const durableCrmLeadSchema = z.object({
  id: z.string().min(1).max(300),
  name: z.string().trim().min(1).max(500),
  kind: z.enum(["organization", "professional", "candidate", "referral"]),
  domain: z.string().max(500).optional(),
  website: z.string().url().max(4_000).optional(),
  location: z.string().max(500).optional(),
  score: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  reasons: z.array(z.string().max(1_000)).max(50),
  unknowns: z.array(z.string().max(1_000)).max(50),
  emails: z.array(z.string().email().max(500)).max(30),
  phones: z.array(z.string().max(100)).max(30),
  evidence: z.array(evidenceSchema).max(100),
  signals: z.array(z.string().max(300)).max(100),
  pipeline: z.enum(["referral", "talent"]),
  stage: z.string().trim().min(1).max(80),
  savedAt: z.string().datetime().optional(),
});

export type DurableCrmLeadInput = z.infer<typeof durableCrmLeadSchema>;

export async function listDurableCrmLeads() {
  const prisma = getPrisma();
  if (!prisma) return null;
  const rows = await prisma.crmLead.findMany({ orderBy: { updatedAt: "desc" }, take: 1_000 });
  return rows.map(toClientLead);
}

export async function upsertDurableCrmLead(input: DurableCrmLeadInput) {
  const prisma = getPrisma();
  if (!prisma) return null;
  assertPipelineMatchesKind(input);

  const row = await prisma.crmLead.upsert({
    where: { sourceKey: input.id },
    create: {
      sourceKey: input.id,
      name: input.name,
      kind: input.kind,
      pipeline: input.pipeline,
      stage: input.stage,
      score: input.score,
      confidence: input.confidence,
      website: input.website,
      domain: input.domain,
      location: input.location,
      primaryEmail: input.emails[0],
      primaryPhone: input.phones[0],
      evidenceJson: input.evidence,
      reasonsJson: input.reasons,
      unknownsJson: input.unknowns,
      signalsJson: input.signals,
      savedAt: input.savedAt ? new Date(input.savedAt) : undefined,
    },
    update: {
      name: input.name,
      kind: input.kind,
      pipeline: input.pipeline,
      stage: input.stage,
      score: input.score,
      confidence: input.confidence,
      website: input.website,
      domain: input.domain,
      location: input.location,
      primaryEmail: input.emails[0],
      primaryPhone: input.phones[0],
      evidenceJson: input.evidence,
      reasonsJson: input.reasons,
      unknownsJson: input.unknowns,
      signalsJson: input.signals,
    },
  });
  return toClientLead(row);
}

export async function updateDurableCrmStage(sourceKey: string, stage: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return toClientLead(await prisma.crmLead.update({
    where: { sourceKey },
    data: { stage: stage.trim().slice(0, 80) },
  }));
}

function assertPipelineMatchesKind(input: DurableCrmLeadInput) {
  if (input.kind === "candidate" && input.pipeline !== "talent") {
    throw new Error("Candidates must use the talent pipeline.");
  }
  if (input.kind !== "candidate" && input.pipeline !== "referral") {
    throw new Error("Referral organizations and professionals must use the referral pipeline.");
  }
}

function toClientLead(row: {
  sourceKey: string;
  name: string;
  kind: string;
  pipeline: string;
  stage: string;
  score: number;
  confidence: number;
  website: string | null;
  domain: string | null;
  location: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  evidenceJson: unknown;
  reasonsJson: unknown;
  unknownsJson: unknown;
  signalsJson: unknown;
  savedAt: Date;
}) {
  return {
    id: row.sourceKey,
    name: row.name,
    kind: row.kind,
    pipeline: row.pipeline,
    stage: row.stage,
    score: row.score,
    confidence: row.confidence,
    website: row.website ?? undefined,
    domain: row.domain ?? undefined,
    location: row.location ?? undefined,
    emails: row.primaryEmail ? [row.primaryEmail] : [],
    phones: row.primaryPhone ? [row.primaryPhone] : [],
    evidence: asArray(row.evidenceJson),
    reasons: asStringArray(row.reasonsJson),
    unknowns: asStringArray(row.unknownsJson),
    signals: asStringArray(row.signalsJson),
    savedAt: row.savedAt.toISOString(),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
