import type { SourceDescriptor } from "./source-types";

const SOURCES: SourceDescriptor[] = [
  {
    id: "duckduckgo-html",
    name: "Public Web Search",
    description: "API-key-free HTML search used to discover public organization, community, recruiting, and market pages.",
    purposes: ["discover", "monitor"],
    method: "fetch",
    entityKinds: ["organization", "professional", "candidate", "referral", "community_signal", "competitor_signal"],
    coverage: ["US"],
    apiKeyRequired: false,
    health: "ready",
    usageNote: "Use conservatively, cache results, and do not treat search snippets as verified facts.",
  },
  {
    id: "public-website",
    name: "Organization Website",
    description: "Direct public website enrichment for contact details, service language, staff pages, careers, and referral information.",
    purposes: ["enrich", "verify", "monitor"],
    method: "fetch",
    entityKinds: ["organization", "professional", "candidate", "referral", "competitor_signal"],
    coverage: ["US"],
    apiKeyRequired: false,
    health: "ready",
    usageNote: "Public pages only. Respect access controls and do not bypass authentication.",
  },
  {
    id: "cms-nppes",
    name: "CMS NPPES / NPI",
    description: "Official downloadable provider data intended for local indexing and provider verification.",
    purposes: ["discover", "verify"],
    method: "download",
    entityKinds: ["organization", "professional"],
    coverage: ["US"],
    apiKeyRequired: false,
    health: "ready",
    usageNote: "Prefer downloadable CMS datasets and incremental updates over paid lookup APIs.",
  },
  {
    id: "state-childcare",
    name: "State Child-Care Licensing",
    description: "Official state licensing sources for licensed child-care centers and preschools.",
    purposes: ["discover", "verify", "monitor"],
    method: "browser",
    entityKinds: ["organization", "referral"],
    coverage: ["NJ", "MO"],
    apiKeyRequired: false,
    health: "degraded",
    usageNote: "Adapter varies by state. Browser automation is used only for public interfaces that require it.",
  },
  {
    id: "public-community",
    name: "Public Community Signals",
    description: "Area-level demand signals discovered from public forums, Reddit results, public resource pages, and indexable community discussions.",
    purposes: ["monitor"],
    method: "fetch",
    entityKinds: ["community_signal", "territory"],
    coverage: ["US"],
    apiKeyRequired: false,
    health: "ready",
    usageNote: "Aggregate to territory level. Do not create parent/child profiles or household disability targeting.",
  },
  {
    id: "playwright-public-browser",
    name: "Playwright Public Browser",
    description: "Optional browser collector for public JS-rendered pages, forms, and pagination.",
    purposes: ["discover", "enrich", "verify", "monitor"],
    method: "browser",
    entityKinds: ["organization", "professional", "candidate", "referral", "community_signal", "competitor_signal"],
    coverage: ["US"],
    apiKeyRequired: false,
    health: "degraded",
    usageNote: "Runtime activates only when the Playwright package and browser binary are installed. No login bypassing or private-group access.",
  },
];

export function getSourceRegistry(): SourceDescriptor[] {
  return SOURCES;
}

export function getSource(id: string) {
  return SOURCES.find((source) => source.id === id);
}
