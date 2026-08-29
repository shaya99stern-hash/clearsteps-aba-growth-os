import { getPrisma } from "@/lib/db/prisma";
import type { EngineScore, LeadEngine } from "@/lib/intelligence/phase3/indicator-catalog";
import type { ResolvedLead, SourcePurpose } from "@/lib/intelligence/source-types";

export interface ScoutResearchSourceState {
  source: string;
  status: "working" | "complete" | "unavailable";
  detail: string;
}

export interface ScoutResearchPersistenceInput {
  query: string;
  location: string;
  state: "MO" | "KS";
  engine: LeadEngine;
  plan: unknown;
  sourceStatus: readonly ScoutResearchSourceState[];
  screened: number;
  leads: readonly ResolvedLead[];
  engineScores: Record<LeadEngine, EngineScore>;
  territory: {
    location: string;
    total: number;
    label: string;
    confidence: number;
    coverage: number;
    reasoning: readonly string[];
  };
  errors: readonly string[];
  completedAt?: string;
}

export interface ResearchRunWrite {
  query: string;
  location?: string;
  status: "complete";
  planJson: string;
  sourceJson: string;
  screenedCount: number;
  qualifiedCount: number;
  errorsJson: string;
  completedAt: Date;
}

export interface EvidenceRecordWrite {
  entityType: string;
  entityId: string;
  sourceId: string;
  purpose: SourcePurpose;
  title?: string;
  url?: string;
  snippet?: string;
  query?: string;
  confidence: number;
  capturedAt: Date;
}

export interface ScoreSnapshotWrite {
  entityType: string;
  entityId: string;
  score: number;
  confidence: number;
  breakdownJson: string;
  reasonsJson: string;
}

export interface ScoutResearchPersistencePayload {
  researchRun: ResearchRunWrite;
  evidence: EvidenceRecordWrite[];
  scoreSnapshots: ScoreSnapshotWrite[];
}

export interface ScoutResearchPersistenceWriter {
  save(payload: ScoutResearchPersistencePayload): Promise<{ runId: string }>;
}

export type ScoutResearchPersistenceResult =
  | {
      persisted: true;
      runId: string;
      evidenceCount: number;
      scoreSnapshotCount: number;
    }
  | { persisted: false; reason: "database_unavailable" };

export function buildScoutResearchPersistence(
  input: ScoutResearchPersistenceInput,
): ScoutResearchPersistencePayload {
  const completedAt = safeDate(input.completedAt);
  const evidence = dedupeEvidence(input.leads);
  const selectedEngineScore = input.engineScores[input.engine];
  const scoreSnapshots: ScoreSnapshotWrite[] = [
    {
      entityType: "territory",
      entityId: territoryEntityId(input.state, input.location || input.territory.location, input.engine),
      score: clampScore(input.territory.total),
      confidence: clampScore(input.territory.confidence),
      breakdownJson: JSON.stringify({
        engine: input.engine,
        coverage: input.territory.coverage,
        engineScore: selectedEngineScore,
      }),
      reasonsJson: JSON.stringify([...input.territory.reasoning]),
    },
    ...input.leads.map((lead) => ({
      entityType: lead.kind,
      entityId: lead.id,
      score: clampScore(lead.score),
      confidence: clampScore(lead.confidence),
      breakdownJson: JSON.stringify({
        signals: [...lead.signals],
        unknowns: [...lead.unknowns],
      }),
      reasonsJson: JSON.stringify([...lead.reasons]),
    })),
  ];

  return {
    researchRun: {
      query: input.query,
      location: input.location.trim() || undefined,
      status: "complete",
      planJson: JSON.stringify({
        state: input.state,
        engine: input.engine,
        plan: input.plan,
      }),
      sourceJson: JSON.stringify(input.sourceStatus),
      screenedCount: nonNegativeInteger(input.screened),
      qualifiedCount: input.leads.length,
      errorsJson: JSON.stringify(input.errors),
      completedAt,
    },
    evidence,
    scoreSnapshots,
  };
}

export async function persistScoutResearch(
  input: ScoutResearchPersistenceInput,
  writer: ScoutResearchPersistenceWriter | null = createPrismaResearchWriter(),
): Promise<ScoutResearchPersistenceResult> {
  if (!writer) return { persisted: false, reason: "database_unavailable" };

  const payload = buildScoutResearchPersistence(input);
  const saved = await writer.save(payload);
  return {
    persisted: true,
    runId: saved.runId,
    evidenceCount: payload.evidence.length,
    scoreSnapshotCount: payload.scoreSnapshots.length,
  };
}

function createPrismaResearchWriter(): ScoutResearchPersistenceWriter | null {
  const prisma = getPrisma();
  if (!prisma) return null;

  return {
    save: async (payload) => prisma.$transaction(async (tx) => {
      const run = await tx.researchRun.create({ data: payload.researchRun });
      if (payload.evidence.length > 0) {
        await tx.evidenceRecord.createMany({ data: payload.evidence });
      }
      if (payload.scoreSnapshots.length > 0) {
        await tx.scoreSnapshot.createMany({ data: payload.scoreSnapshots });
      }
      return { runId: run.id };
    }),
  };
}

function dedupeEvidence(leads: readonly ResolvedLead[]): EvidenceRecordWrite[] {
  const records = new Map<string, EvidenceRecordWrite>();
  for (const lead of leads) {
    for (const evidence of lead.evidence) {
      const key = `${lead.kind}:${lead.id}:${evidence.id}`;
      if (records.has(key)) continue;
      records.set(key, {
        entityType: lead.kind,
        entityId: lead.id,
        sourceId: evidence.sourceId,
        purpose: evidence.purpose,
        title: evidence.title || undefined,
        url: evidence.url || undefined,
        snippet: evidence.snippet || undefined,
        query: evidence.query || undefined,
        confidence: clampScore(lead.confidence),
        capturedAt: safeDate(evidence.capturedAt),
      });
    }
  }
  return [...records.values()];
}

function territoryEntityId(state: "MO" | "KS", location: string, engine: LeadEngine) {
  return `${state}:${slug(location || state)}:${engine}`;
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "statewide";
}

function safeDate(value?: string) {
  if (value) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return new Date();
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
