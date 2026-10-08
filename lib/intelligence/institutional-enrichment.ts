import type { EnrichedWebsite, PublicSearchHit, ResolvedLead, SearchEvidence } from "./source-types";

/** Verify named public ORGANIZATIONS, never families, clinicians' home addresses, or review authors. */
const SOURCE_DOMAINS=["google.com","yelp.com","facebook.com","reddit.com","linkedin.com","instagram.com",
  "npiregistry.cms.hhs.gov","data.colorado.gov","data.mo.gov","gis.mo.gov","bing.com",
  "indeed.com","glassdoor.com","yellowpages.com","mapquest.com","bbb.org","healthgrades.com"];
const OFFICIAL_FEEDS=new Set(["co-cdec-licensed-childcare","mo-dhss-child-care-gis","ks-kdhe-tiny-k-reports"]);
function host(url:string) {
  try {const u=new URL(url);return ["http:","https:"].includes(u.protocol)?u.hostname.toLowerCase().replace(/^www\./,""):"";}
  catch{return "";}
}
function excluded(url:string) {
  const domain=host(url);
  return !domain||SOURCE_DOMAINS.some((item)=>domain===item||domain.endsWith("."+item));
}
const NORMALIZE:Record<string,string>={sch:"school",dist:"district",ctr:"center",cty:"county",dev:"developmental",
  hosp:"hospital",elem:"elementary",acad:"academy",dept:"department",svc:"service",svcs:"services"};
function tokens(input:string) {
  return input.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(Boolean)
    .map((word)=>NORMALIZE[word]??word);
}
const GENERIC=new Set(["the","and","inc","llc","co","of","at","a","an","for","center","school","district",
  "county","therapy","behavior","behavioral","services","child","children","preschool","program","clinic","aba"]);
/** Business identity requires strong organization tokens, including every distinctive numeric identifier. */
export function matchesPublicOrganization(name:string, published:string) {
  const identity=tokens(name),body=tokens(published);
  if(identity.length<2 || body.length<2)return false;
  const normalizedName=identity.join(" "),normalizedText=body.join(" ");
  if(normalizedText.includes(normalizedName))return true;
  const distinctive=[...new Set(identity.filter((word)=>!GENERIC.has(word)&&word.length>=2))];
  if(distinctive.length<2)return false;
  // E.g., school district 12 and 14 are NOT interchangeable.
  if(distinctive.filter((word)=>/^\d+$/.test(word)).some((number)=>!body.includes(number)))return false;
  const overlap=distinctive.filter((word)=>body.includes(word));
  return overlap.length>=2 && overlap.length/distinctive.length>=0.60;
}
/** A news article about an organization is not the organization's own website. */
function plausibleOrganizationDomain(name:string,url:string) {
  const domain=host(url).split(".")[0]?.replace(/[^a-z0-9]/g,"")??"";
  const nameTokens=[...new Set(tokens(name).filter((word)=>!GENERIC.has(word)&&word.length>=2))];
  return Boolean(domain && nameTokens.some((word)=>domain.includes(word)));
}
export function isPublicInstitutionalLead(lead:ResolvedLead) {
  return ["organization","referral"].includes(lead.kind)
    && lead.evidence.some((item)=>OFFICIAL_FEEDS.has(item.sourceId))
    && lead.name.length>=5;
}
export function publicInstitutionLookupQuery(name:string,location:string) {
  return '"' + name.replace(/["\n\r]/g,"").slice(0,110) + '" official website contact ' + location.slice(0,75);
}
export function selectOrganizationWebsiteHit(lead:Pick<ResolvedLead,"name"|"evidence">,hits:readonly PublicSearchHit[]) {
  const sourceHosts=new Set(lead.evidence.map((item)=>host(item.url)).filter(Boolean));
  return hits.find((hit)=>!excluded(hit.url)&&!sourceHosts.has(host(hit.url))
    && plausibleOrganizationDomain(lead.name,hit.url)
    && matchesPublicOrganization(lead.name,hit.title+" "+hit.snippet))??null;
}
export function enrichInstitutionalLead(
  lead:ResolvedLead, hit:PublicSearchHit, verifiedSite:EnrichedWebsite|null, capturedAt=new Date().toISOString(),
):ResolvedLead {
  if(excluded(hit.url)||!plausibleOrganizationDomain(lead.name,hit.url)
    ||!matchesPublicOrganization(lead.name,hit.title+" "+hit.snippet))return lead;
  // Require actual live organization page corroboration before treating public phones or emails as its contacts.
  const verified=verifiedSite&&host(verifiedSite.finalUrl)===host(hit.url)
    && matchesPublicOrganization(lead.name,(verifiedSite.title??"")+" "+verifiedSite.textSample.slice(0,1400))
    ? verifiedSite:null;
  const evidence:SearchEvidence={
    id:"institutional-site-"+lead.id,
    sourceId:"public-organization-lookup",
    title:hit.title.slice(0,200),
    url:hit.url,
    snippet:hit.snippet.slice(0,450),
    query:hit.query,
    capturedAt,purpose:"verify",geography:lead.location,
  };
  const emails=verified?[...new Set([...lead.emails,...verified.emails])].slice(0,8):lead.emails;
  const phones=verified?[...new Set([...lead.phones,...verified.phones])].slice(0,8):lead.phones;
  return {
    ...lead,
    domain:verified?host(verified.finalUrl):lead.domain,
    website:verified?.finalUrl??lead.website,
    emails,phones,
    evidence:[...lead.evidence,evidence],
    // A search result is a research link. Only a verified site raises evidence confidence.
    confidence:verified?Math.min(74,lead.confidence+15):lead.confidence,
    score:verified?Math.min(65,lead.score+9):lead.score,
    reasons:[...lead.reasons,verified?
      "Public organization website independently matched against official registry; contact details from its website":
      "Possible institutional website located via public search, awaiting live ownership verification"],
    unknowns:lead.unknowns.filter((item)=>!verified||!item.includes("Only one independent publisher")),
  };
}