import type { LeadEngine } from "../phase3/indicator-catalog";
import {
  collectStateSourceContribution,
  type StateSourceContribution,
  type StateSourceRuntimeDependencies,
} from "./state-source-contribution";
import { stateSourceSelection } from "./state-source-selection";

export interface ScoutStateSourceDescriptor {
  source: string;
  workingDetail: string;
  emptyDetail: string;
  errorFallback: string;
  errorPrefix: string;
}

export interface ScoutStateSourceInput {
  state: "MO" | "KS";
  engine: LeadEngine;
  location: string;
  under18Population: number;
}

export interface ScoutStateSourceResult {
  descriptor: ScoutStateSourceDescriptor;
  contribution: StateSourceContribution;
}

const MISSOURI_DESCRIPTOR: ScoutStateSourceDescriptor = {
  source: "Missouri DHSS Child Care",
  workingDetail: "official Missouri DHSS child-care facility GIS evidence",
  emptyDetail: "0 official Missouri DHSS child-care facilities matched",
  errorFallback: "Missouri DHSS child-care source failed",
  errorPrefix: "missouri child care",
};

const KANSAS_DESCRIPTOR: ScoutStateSourceDescriptor = {
  source: "Kansas KDHE Early Intervention",
  workingDetail: "official Kansas KDHE tiny-k / early-intervention program roster",
  emptyDetail: "0 current Kansas KDHE early-intervention programs matched",
  errorFallback: "Kansas KDHE early-intervention source failed",
  errorPrefix: "kansas early intervention",
};

export function scoutStateSourceDescriptor(
  state: "MO" | "KS",
  engine: LeadEngine,
): ScoutStateSourceDescriptor | null {
  const selection = stateSourceSelection(state, engine);
  if (selection.missouriChildCare) return MISSOURI_DESCRIPTOR;
  if (selection.kansasEarlyIntervention) return KANSAS_DESCRIPTOR;
  return null;
}

export async function collectScoutStateSource(
  input: ScoutStateSourceInput,
  dependencies: Partial<StateSourceRuntimeDependencies> = {},
): Promise<ScoutStateSourceResult | null> {
  const descriptor = scoutStateSourceDescriptor(input.state, input.engine);
  if (!descriptor) return null;

  const contribution = await collectStateSourceContribution(input, dependencies);
  return { descriptor, contribution };
}
