import type { PublicSearchHit, ResolvedLead } from "../source-types";

/**
 * Competitor reputation discovery. Yelp and Google Maps forbid scraping review
 * bodies; their links are surfaced only for user-initiated source verification.
 * No review text, reviewer name, profile, address, or child information is stored.
 */
export type ReviewPublisher = "Google Maps" | "Yelp" | "BBB" | "Independent press" | "Other public source";
export interface ProviderReviewReference {
  url: string;
  publisher: ReviewPublisher;
  access: "link_only" | "third_party_context";
  verification: "not_verified";
}
export interface ProviderReputationDossier {
  organizationId: string;
  organizationName: string;
  reviews: ProviderReviewReference[];
  distinctPublishers: number;
  verifiedReviewCount: 0;
  finding: "unverified";
  guidance: string;
}

export function isRestrictedReviewSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./,"");
    return hostname==="yelp.com" || hostname.endsWith(".yelp.com") ||
      hostname==="maps.google.com" ||
      ((hostname==="google.com" || hostname.endsWith(".google.com")) && new URL(url).pathname.startsWith("/maps")) ||
      hostname==="g.page";
  } catch { return false; }
}

function publisher(url: string): ReviewPublisher {
  try {
    const hostname=new URL(url).hostname.toLowerCase().replace(/^www\./,"");
    if (hostname==="yelp.com" || hostname.endsWith(".yelp.com")) return "Yelp";
    if (hostname==="g.page" || ((hostname==="google.com" || hostname.endsWith(".google.com")) && new URL(url).pathname.startsWith("/maps"))) return "Google Maps";
    if (hostname==="bbb.org" || hostname.endsWith(".bbb.org")) return "BBB";
    if (/news|gazette|journal|tribune|press|times|post|reporter|radio/i.test(hostname)) return "Independent press";
  } catch { /* Ignore invalid URLs. */ }
  return "Other public source";
}
function normalize(text:string) {
  return text.toLowerCase().replace(/\s*[|–—-]\s*(?:reviews?|ratings?|yelp|google maps).*/i, "")
    .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
const GENERIC = new Set(["the","and","of","a","aba","therapy","therapies","behavior","behavioral","autism","services","center","centers","clinic","clinics","health","care","child","children"]);
export function reviewBelongsToOrganization(hit:PublicSearchHit,organizationName:string) {
  const name=normalize(organizationName);
  const distinctive=name.split(" ").filter((word)=>word.length>2 && !GENERIC.has(word));
  if (distinctive.length===0 || name.length<8) return false;
  const title=normalize(hit.title);
  return title.includes(name) || (distinctive.length>=2 && distinctive.every((word)=>title.split(" ").includes(word)));
}
export function providerReviewQueries(lead: Pick<ResolvedLead,"name" | "kind">,location:string) {
  const broad=providerReviewQuery(lead,location);
  if(!broad) return [];
  const escapedName='"'+lead.name.slice(0,100).replace(/["\\]/g,"")+'"';
  return [
    broad,
    "site:google.com/maps " + escapedName + " reviews " + location.slice(0,80),
    "site:yelp.com/biz " + escapedName + " reviews " + location.slice(0,80),
  ];
}

export function providerReviewQuery(lead: Pick<ResolvedLead,"name" | "kind">,location:string) {
  if (!["organization","referral"].includes(lead.kind) || !/\b(aba|behavior|autism|therapy|therapies)\b/i.test(lead.name)) return null;
  if (lead.name.length<8 || !/[A-Za-z]/.test(lead.name)) return null;
  return '"' + lead.name.slice(0,100).replace(/["\\]/g,"") + '" reviews ratings patient experience ' + location.slice(0,80);
}

export function buildProviderReviewDossier(
  lead:Pick<ResolvedLead,"id"|"name">, hits:readonly PublicSearchHit[],
):ProviderReputationDossier {
  const deduped=new Map<string,ProviderReviewReference>();
  for(const hit of hits) {
    if (!reviewBelongsToOrganization(hit,lead.name)) continue;
    let uri:URL;
    try {uri=new URL(hit.url)} catch {continue}
    if (!["https:","http:"].includes(uri.protocol)) continue;
    const kind=publisher(hit.url);
    if (kind==="Other public source") continue; // Unknown sites require manual research, not automatic reputation claims.
    const clean=uri.origin+uri.pathname;
    if(deduped.has(clean)) continue;
    deduped.set(clean,{
      url:clean,publisher:kind,
      access:kind==="Google Maps"||kind==="Yelp"||kind==="BBB"?"link_only":"third_party_context",
      verification:"not_verified",
    });
  }
  return {
    organizationId:lead.id,organizationName:lead.name,
    reviews:[...deduped.values()].slice(0,8),
    distinctPublishers:new Set([...deduped.values()].map((x)=>x.publisher)).size,
    verifiedReviewCount:0,finding:"unverified",
    guidance:"Review-page links only. Do not scrape Google/Yelp/BBB reviews or retain reviewers' personal and medical details. Published accounts require independently verified organization-level corroboration before market scoring.",
  };
}

/** Single or contradictory reviews must never influence territory ratings. */
export function reputationMayIncreaseOpportunityScore(dossier:ProviderReputationDossier):false {
  void dossier;
  return false;
}
