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
import { searchColoradoChildCare, coloradoChildCareToSearchHits, coloradoChildCareObservations, type ColoradoChildCareFacility } from "./co-childcare";

export interface StateSourceContributionInput {
  state: "MO" | "KS" | "CO";
  engine: LeadEngine;
  location: string;
  under18Population: number;
  missouriChildCare?: readonly MissouriChildCareProvider[];
  kansasEarlyIntervention?: readonly KansasEarlyInterventionProgram[];
  coloradoChildCare?: readonly ColoradoChildCareFacility[];
}

export interface StateSourceContribution {
  referralHits: PublicSearchHit[];
  observations: IndicatorObservation[];
  sourceDetail: string | null;
  /** Evidence uses a dated static publication rather than a successful live request. */
  snapshotOnly?: boolean;
}

export interface StateSourceRuntimeDependencies {
  searchMissouriChildCare: (location: string) => Promise<MissouriChildCareProvider[]>;
  searchKansasEarlyIntervention: (location: string) => Promise<KansasEarlyInterventionProgram[]>;
  searchColoradoChildCare: (location: string) => Promise<ColoradoChildCareFacility[]>;
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
    const snapshotOnly = programs.some((program) => program.archivedSnapshot);
    return {
      referralHits: kansasEarlyInterventionToSearchHits(programs, input.location),
      observations: buildKansasEarlyInterventionObservations(programs, input.under18Population),
      ...(snapshotOnly ? { snapshotOnly: true } : {}),
      sourceDetail: snapshotOnly
        ? programs.length + " published Kansas institutional listings (historical reference, not live verified; no density scored)"
        : `${programs.length} current Kansas KDHE early-intervention ${programs.length === 1 ? "program" : "programs"}`,
    };
  }

  if (selection.coloradoChildCare) {
    if (input.coloradoChildCare === undefined) return { referralHits: [], observations: [], sourceDetail: null };
    const facilities = input.coloradoChildCare;
    const bounded = !/^(colorado|co|statewide)$/i.test(input.location.trim());
    return {
      referralHits: coloradoChildCareToSearchHits(facilities, input.location),
      observations: coloradoChildCareObservations(facilities, input.under18Population, bounded),
      sourceDetail: facilities.length + " Colorado CDEC institutional facilities" + (bounded ? "" : " (statewide sample only; no density scored)"),
    };
  }
  return { referralHits: [], observations: [], sourceDetail: null };
}

export async function collectStateSourceContribution(
  input: Omit<StateSourceContributionInput, "missouriChildCare" | "kansasEarlyIntervention" | "coloradoChildCare">,
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

  if (selection.coloradoChildCare) {
    const facilities = await (dependencies.searchColoradoChildCare ?? searchColoradoChildCare)(input.location);
    return buildStateSourceContribution({ ...input, coloradoChildCare: facilities });
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
