import type { PublicSearchHit, ResolvedLead } from "../source-types";

/**
 * Reputation research for ORGANIZATIONS only. No reviewer/user records or review text are retained.
 * Google Maps / Yelp are link-only: never request their review pages, bulk extract ratings,
 * rehost review text, or treat platform content as independently verified facts.
 */
export type ReviewTheme = "intake_wait" | "communication" | "appointments" | "staffing" | "insurance" | "availability" | "positive_feedback";
export type ReviewSentiment = "positive" | "concern" | "mixed";
export interface ReviewPortalLink {
  platform: "Google Maps" | "Yelp" | "Other public review page";
  url: string;
  linkOnly: true;
  source: "indexed_business_page" | "external_search";
}
export interface ReviewThemeFinding {
  theme: ReviewTheme;
  sentiment: ReviewSentiment;
  publishers: number;
  sources: string[];
  independentlyCorroborated: boolean;
}
export interface CompetitorReviewInsight {
  leadId: string;
  organization: string;
  reviewLinks: ReviewPortalLink[];
  publicThemes: ReviewThemeFinding[];
  sourceCount: number;
  status: "corroborated" | "unconfirmed" | "no_public_evidence";
  note: string;
}
const BLOCKED_REVIEW_HOSTS = [
  "google.com", "google.co.uk", "maps.google.com", "yelp.com", "yelp.ca",
  "glassdoor.com", "indeed.com", "facebook.com", "healthgrades.com",
];
const THEMES: readonly [ReviewTheme, ReviewSentiment, RegExp][] = [
  ["intake_wait", "concern", /\b(waitlists?|waiting list|months? waiting|intake delays?|long wait)\b/i],
  ["communication", "concern", /\b(unreturned calls?|does not respond|no response|unresponsive|poor communication)\b/i],
  ["appointments", "concern", /\b(repeated cancellations?|schedule(?:ing)? problems?|appointment delays?)\b/i],
  ["staffing", "concern", /\b(staff turnover|staff shortages?|therapist vacancies|understaffed)\b/i],
  ["insurance", "concern", /\b(insurance denied|insurance issues?|billing dispute|out.of.network)\b/i],
  ["availability", "concern", /\b(no longer accepting|not taking new clients|intake closed|service unavailable)\b/i],
  ["positive_feedback", "positive", /\b(praised|commended|recognized for|awarded for)\b.{0,70}\b(care|services|staff|team)\b/i],
];
function hostname(url: string) {
  try {
    const value = new URL(url);
    if (value.protocol !== "https:" && value.protocol !== "http:") return "";
    return value.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return ""; }
}
function isHost(host: string, suffix: string) {
  return host === suffix || host.endsWith("." + suffix);
}
export function isRestrictedReviewPlatformUrl(url: string): boolean {
  const domain=hostname(url);
  return BLOCKED_REVIEW_HOSTS.some((host)=>isHost(domain,host));
}
function normalize(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function namedOrganization(name: string) {
  const normalized=normalize(name);
  return normalized.length>=10 && normalized.split(" ").filter(Boolean).length>=2;
}
function matchesBusiness(hit: PublicSearchHit, businessName: string) {
  if (!namedOrganization(businessName)) return false;
  const name=normalize(businessName),title=normalize(hit.title),snippet=normalize(hit.snippet);
  return title.includes(name) || snippet.includes(name);
}
function rootPublisher(host: string) {
  const parts=host.split(".");
  if(parts.length<=2 || host.endsWith(".gov"))return host;
  if(host.endsWith(".co.uk"))return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}
function isOrganizationCompetitor(lead: ResolvedLead) {
  if (lead.kind === "competitor_signal") return true;
  if (!["organization","referral"].includes(lead.kind)) return false;
  if (!namedOrganization(lead.name)) return false;
  const institution=lead.name+" "+lead.evidence.filter((e)=>!isRestrictedReviewPlatformUrl(e.url))
    .slice(0,4).map((e)=>e.title).join(" ");
  // A preschool's referral directory listing alone is not evidence it is a competitor.
  return /\b(aba|applied behavior analysis|behavioral? therapy|autism therapy)\b/i.test(institution);
}
export function candidateAbaCompetitors(leads: readonly ResolvedLead[], max=3): ResolvedLead[] {
  const seen=new Set<string>();
  return leads.filter((lead)=>{
    if (!isOrganizationCompetitor(lead)) return false;
    const name=normalize(lead.name);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0,Math.max(0,Math.min(5,max)));
}
function searchLink(platform:"Google Maps"|"Yelp",name:string,location:string):ReviewPortalLink {
  if(platform==="Google Maps")return {
    platform,url:"https://www.google.com/maps/search/?"+new URLSearchParams({api:"1",query:name+" "+location}),
    linkOnly:true,source:"external_search",
  };
  return {
    platform,url:"https://www.yelp.com/search?"+new URLSearchParams({find_desc:name,find_loc:location}),
    linkOnly:true,source:"external_search",
  };
}
export function reviewDiscoveryQueries(name:string,location:string):string[] {
  if(!namedOrganization(name))return [];
  const phrase='"'+name.replace(/["\r\n]/g,"").slice(0,100)+'"';
  return [
    phrase+" ABA therapy reviews "+location,
    phrase+" clinic intake waitlist complaints feedback "+location,
  ];
}
export function summarizeCompanyReviewEvidence(
  lead: Pick<ResolvedLead,"id"|"name"> & {domain?:string},
  searchHits:readonly PublicSearchHit[],
  location:string,
):CompetitorReviewInsight {
  const links:ReviewPortalLink[]=[
    searchLink("Google Maps",lead.name,location),
    searchLink("Yelp",lead.name,location),
  ];
  const evidence=new Map<ReviewTheme,Map<string,ReviewSentiment>>();
  const distinctNarratives=new Map<ReviewTheme,Set<string>>();
  let publishedMatches=0;
  for(const hit of searchHits.slice(0,80)) {
    if(!matchesBusiness(hit,lead.name))continue;
    const host=hostname(hit.url);
    if(!host)continue;
    // Restricted platforms: allow verified company-page *links* only. Never parse/reuse their review text.
    if(isRestrictedReviewPlatformUrl(hit.url)) {
      let platform:ReviewPortalLink["platform"]|null=null;
      if(isHost(host,"google.com"))platform="Google Maps";
      if(isHost(host,"yelp.com"))platform="Yelp";
      if(platform && /\/(maps|biz|place|search)\b/i.test(new URL(hit.url).pathname)) {
        const index=links.findIndex((item)=>item.platform===platform);
        if(index>=0)links[index]={platform,url:hit.url,linkOnly:true,source:"indexed_business_page"};
      }
      continue;
    }
    // An independent publisher must discuss the actual ORGANIZATION and a relevant program theme.
    // Skip personal/medical narratives entirely, without saving the raw passage.
    const snippet=(hit.title+" "+hit.snippet).slice(0,1400);
    if(/\b(my child|my son|my daughter|our child|diagnos(?:ed|is)|medical record|home address|lives at)\b/i.test(snippet))continue;
    if(!/\b(aba|behavioral? therapy|autism services|pediatric therapy|clinic)\b/i.test(snippet))continue;
    if (lead.domain && (host===lead.domain || host.endsWith("."+lead.domain))) continue;
    const publisher=rootPublisher(host);
    let matched=false;
    for(const [theme,sentiment,re] of THEMES) {
      if(!re.test(snippet))continue;
      const fingerprint=normalize(snippet);
      const seen=distinctNarratives.get(theme)??new Set<string>();
      if(seen.has(fingerprint))continue; // Syndicated copy is not independent corroboration.
      seen.add(fingerprint);
      distinctNarratives.set(theme,seen);
      const domains=evidence.get(theme)??new Map<string,ReviewSentiment>();
      domains.set(publisher,sentiment);
      evidence.set(theme,domains);
      matched=true;
    }
    if(matched)publishedMatches++;
  }
  const publicThemes:ReviewThemeFinding[]=[...evidence.entries()].map(([theme,domains])=>({
    theme,sentiment:[...new Set(domains.values())].length>1?"mixed":[...domains.values()][0],
    publishers:domains.size,sources:[...domains.keys()].slice(0,8),
    independentlyCorroborated:domains.size>=2,
  })).sort((a,b)=>Number(b.independentlyCorroborated)-Number(a.independentlyCorroborated)||b.publishers-a.publishers);
  const corroborated=publicThemes.some((item)=>item.independentlyCorroborated);
  return {
    leadId:lead.id,organization:lead.name,reviewLinks:links,
    publicThemes,sourceCount:publishedMatches,
    status:corroborated?"corroborated":publicThemes.length?"unconfirmed":"no_public_evidence",
    note:"External Google/Yelp links are for manual inspection only, not scraped ratings. Themes come only from independent public organization-level reporting; no reviewers or family narratives are retained. Public feedback is not proof of service quality or unmet clinical need.",
  };
}
