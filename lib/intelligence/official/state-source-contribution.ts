import type { LeadEngine, IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";
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
}

export interface StateSourceContribution {
  referralHits: PublicSearchHit[];
  observations: IndicatorObservation[];
  sourceDetail: string | null;
}

export interface StateSourceRuntimeDependencies {
  searchMissouriChildCare: (location: string) => Promise<MissouriChildCareProvider[]>;
}

export function buildStateSourceContribution(input: StateSourceContributionInput): StateSourceContribution {
  const selection = stateSourceSelection(input.state, input.engine);
  if (!selection.missouriChildCare) {
    return { referralHits: [], observations: [], sourceDetail: null };
  }

  const providers = input.missouriChildCare ?? [];
  return {
    referralHits: missouriChildCareToSearchHits(providers, input.location),
    observations: buildMissouriChildCareObservations(providers, input.under18Population),
    sourceDetail: `${providers.length} official Missouri DHSS child-care facilities`,
  };
}

export async function collectStateSourceContribution(
  input: Omit<StateSourceContributionInput, "missouriChildCare">,
  dependencies: StateSourceRuntimeDependencies = { searchMissouriChildCare },
): Promise<StateSourceContribution> {
  const selection = stateSourceSelection(input.state, input.engine);
  if (!selection.missouriChildCare) {
    return { referralHits: [], observations: [], sourceDetail: null };
  }

  const providers = await dependencies.searchMissouriChildCare(input.location);
  return buildStateSourceContribution({ ...input, missouriChildCare: providers });
}
