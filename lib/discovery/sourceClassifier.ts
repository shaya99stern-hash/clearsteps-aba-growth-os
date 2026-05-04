import type { Classification, NormalizedSearchResult } from "@/lib/domain/types";
import { extractSignals } from "./signalExtraction";

const referralSourceTerms = [
  "daycare",
  "preschool",
  "child care",
  "childcare",
  "pediatric",
  "speech therapy",
  "speech language",
  "occupational therapy",
  "early intervention",
  "school",
  "special education",
  "family resource",
  "community nonprofit",
  "parent organization",
  "child development",
];

const directoryTerms = ["directory", "resource list", "resources", "provider list", "find a provider"];

export function classifySearchResult(result: NormalizedSearchResult): Classification {
  const combined = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const signals = extractSignals(combined);

  if (signals.negative.length > 0) return "Weak / Unclear Result";
  if (signals.competitor.length > 0) return "Competitor / Market Signal";
  if (signals.demand.length > 0) return "Demand Signal";
  if (referralSourceTerms.some((term) => combined.includes(term))) return "Referral Source";
  if (signals.contact.length > 0) return "Contact Target";
  if (directoryTerms.some((term) => combined.includes(term))) return "Directory Source";

  return "Weak / Unclear Result";
}

export function reasonForClassification(classification: Classification, signals: string[]) {
  if (classification === "Competitor / Market Signal") {
    return "Classified as competitor/market signal because the source text appears to mention ABA provider, BCBA/RBT, or direct ABA service language.";
  }

  if (classification === "Demand Signal") {
    return "Found because the source text appears to mention unmet need, autism support, Child Find, waitlists, shortages, special education, or related service demand.";
  }

  if (classification === "Referral Source") {
    return "Found because the organization appears to touch children or families who may need developmental, speech, OT, pediatric, school, or parent-resource support.";
  }

  if (classification === "Contact Target") {
    return "Found because the source text appears to identify a role that may handle referrals, parent resources, or program decisions.";
  }

  if (classification === "Directory Source") {
    return "Found because the result appears to be a directory or resource page that may lead to real referral-source organizations.";
  }

  return signals.length > 0
    ? "Weak evidence — verify before outreach. The result has some relevant language but not enough to classify as a strong opportunity."
    : "Weak evidence — verify before outreach. The result does not contain enough relevant source text.";
}

export function shortReasonForResult(classification: Classification, signals: string[]) {
  const topSignals = signals.slice(0, 2).join(", ");

  if (classification === "Competitor / Market Signal") {
    return topSignals ? `ABA provider detected — market signal: ${topSignals}.` : "ABA provider detected — market signal, not referral lead.";
  }
  if (classification === "Demand Signal") {
    return topSignals ? `Public demand signal detected: ${topSignals}.` : "Public demand signal detected; verify details.";
  }
  if (classification === "Referral Source") {
    return topSignals ? `Potential referral source; signals: ${topSignals}.` : "Potential child/family referral source; verify before outreach.";
  }
  if (classification === "Directory Source") {
    return "Directory/resource result; use for secondary lead research.";
  }
  if (classification === "Contact Target") {
    return "Possible decision-maker/contact result; verify role before outreach.";
  }
  return "Weak evidence — verify before outreach.";
}
