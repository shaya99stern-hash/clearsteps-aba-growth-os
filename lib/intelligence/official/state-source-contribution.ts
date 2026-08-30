import { resolveSearchHits } from "../entity-resolution";
import type { LeadEngine, IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit, ResolvedLead } from "../source-types";
import {
  buildKansasEarlyInterventionObservations,
  kansasEarlyInterventionToSearchHits,
  searchKansasEarlyIntervention,
  type KansasEarlyInterventionProgram,
} from "./ks-early-intervention";
import {
  buildMissouriChildCareObservations,
  missouriChildCareToSearchHits,
  searchMissouriChildCare,
  type MissouriChildCareProvider,
} from "./mo-child-care-gis";
import { stateSourceSelection } from "./state-source-selection";

export interface StateSourceContributionInput {
  state: "MO" | "KS";
  engine: LeadEngine;
  location: string;
  under18Population: number;
  missouriChildCare?: readonly MissouriChildCareProvider[];
  kansasEarlyIntervention?: readonly KansasEarlyInterventionProgram[];
}

export interface StateSourceContribution {
  referralHits: PublicSearchHit[];
  observations: IndicatorObservation[];
  sourceDetail: string | null;
}

export interface StateSourceRuntimeDependencies {
  searchMissouriChildCare: (location: string) => Promise<MissouriChildCareProvider[]>;
  searchKansasEarlyIntervention: (location: string) => Promise<KansasEarlyInterventionProgram[]>;
}

export function buildStateSourceContribution(input: StateSourceContributionInput): StateSourceContribution {
  const selection = stateSourceSelection(input.state, input.engine);

  if (selection.missouriChildCare) {
    const providers = input.missouriChildCare ?? [];
    return {
      referralHits: missouriChildCareToSearchHits(providers, input.location),
      observations: buildMissouriChildCareObservations(providers, input.under18Population),
      sourceDetail: `${providers.length} official Missouri DHSS child-care facilities`,
    };
  }

  if (selection.kansasEarlyIntervention) {
    if (input.kansasEarlyIntervention === undefined) {
      return { referralHits: [], observations: [], sourceDetail: null };
    }
    const programs = input.kansasEarlyIntervention;
    return {
      referralHits: kansasEarlyInterventionToSearchHits(programs, input.location),
      observations: buildKansasEarlyInterventionObservations(programs, input.under18Population),
      sourceDetail: `${programs.length} current Kansas KDHE early-intervention ${programs.length === 1 ? "program" : "programs"}`,
    };
  }

  return { referralHits: [], observations: [], sourceDetail: null };
}

export async function collectStateSourceContribution(
  input: Omit<StateSourceContributionInput, "missouriChildCare" | "kansasEarlyIntervention">,
  dependencies: Partial<StateSourceRuntimeDependencies> = {},
): Promise<StateSourceContribution> {
  const selection = stateSourceSelection(input.state, input.engine);

  if (selection.missouriChildCare) {
    const providers = await (dependencies.searchMissouriChildCare ?? searchMissouriChildCare)(input.location);
    return buildStateSourceContribution({ ...input, missouriChildCare: providers });
  }

  if (selection.kansasEarlyIntervention) {
    const programs = await (dependencies.searchKansasEarlyIntervention ?? searchKansasEarlyIntervention)(input.location);
    return buildStateSourceContribution({ ...input, kansasEarlyIntervention: programs });
  }

  return { referralHits: [], observations: [], sourceDetail: null };
}

export function mergeStateSourceLeads(
  existing: readonly ResolvedLead[],
  contribution: StateSourceContribution,
  location: string,
  maxResults: number,
): ResolvedLead[] {
  const official = resolveSearchHits(
    contribution.referralHits.map((hit) => ({ lane: "referral" as const, hit, enrichment: null })),
    location,
  );
  const merged = new Map<string, ResolvedLead>();

  for (const lead of [...official, ...existing]) {
    const current = merged.get(lead.id);
    if (!current || lead.score > current.score || (lead.score === current.score && lead.confidence > current.confidence)) {
      merged.set(lead.id, lead);
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, Math.max(0, maxResults));
}
