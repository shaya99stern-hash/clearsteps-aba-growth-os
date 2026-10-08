import type { LeadEngine } from "../phase3/indicator-catalog";

export function stateSourceSelection(state: "MO" | "KS" | "CO", engine: LeadEngine) {
  return {
    missouriChildCare: state === "MO" && engine === "client",
    kansasEarlyIntervention: state === "KS" && engine === "client",
    coloradoChildCare: state === "CO" && engine === "client",
  } as const;
}
