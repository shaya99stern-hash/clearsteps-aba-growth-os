import type { PayorSignal } from "@/lib/domain/types";

export function scorePayorFit(signal?: PayorSignal) {
  if (!signal?.insurance_source_url && !signal?.payor_notes) {
    return {
      score: 0,
      label: "Payor data not configured",
      reason: "Payor score stays at zero until real insurance/payor evidence or manual notes exist.",
    };
  }

  return {
    score: signal.payor_fit_score ?? 0,
    label: "Payor data present",
    reason: "Payor score is based only on provided payor fields; no insurance data is inferred.",
  };
}
