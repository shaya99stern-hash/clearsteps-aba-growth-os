import type { LeadEngine } from "../phase3/indicator-catalog";

export function stateSourceSelection(state: "MO" | "KS", engine: LeadEngine) {
  return {
    missouriChildCare: state === "MO" && engine === "client",
    kansasEarlyIntervention: state === "KS" && engine === "client",
  } as const;
}
