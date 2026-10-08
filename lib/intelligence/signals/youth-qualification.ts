import type { ResolvedLead, SearchEvidence } from "../source-types";

/**
 * Program age evidence and organization role, NEVER individual children's ages.
 * An age inferred from a school/program label is a research hint, not a verified
 * service policy. Strict ages 2–18 only apply to the Client referral engine.
 */
export type YouthAgeBand = "2-18" | "2-5" | "6-11" | "12-18";
export type YouthAgeStatus =
  | "documented" | "possible" | "mixed" | "outside" | "unknown" | "conflicting";
export type YouthOrgRole =
  | "aba_competitor" | "potential_referral" | "school_program" | "community_resource" | "unclassified";

export interface YouthLeadQualification {
  targetBand: YouthAgeBand;
  ageStatus: YouthAgeStatus;
  organizationRole: YouthOrgRole;
  documentedAgeRanges: Array<{ min: number; max: number }>;
  supportingPublishers: number;
  ageEvidenceDomains: string[];
  missingChecks: string[];
  /** Verified, unique sources and demonstrated referral relationship are distinct. */
  qualifiedForOutreach: boolean;
}

export const AGE_BANDS: Record<YouthAgeBand, {min:number; max:number; label:string}> = {
  "2-18": {min:2,max:18,label:"All ages 2–18"},
  "2-5": {min:2,max:5,label:"Early childhood 2–5"},
  "6-11": {min:6,max:11,label:"School-age 6–11"},
  "12-18": {min:12,max:18,label:"Adolescents 12–18"},
};
function publisher(url:string):string|null {
  try {
    const u=new URL(url);
    if(!["http:","https:"].includes(u.protocol))return null;
    const host=u.hostname.toLowerCase().replace(/^www\./,"");
    if(host.endsWith(".co.uk"))return host.split(".").slice(-3).join(".");
    return host.split(".").slice(-2).join(".");
  } catch {return null;}
}
function safeEvidence(item: SearchEvidence) {
  // Research evidence is public institutional program description, not an
  // individual parent's posted child, diagnosis, health story or home location.
  const text=(item.title+" "+item.snippet).slice(0,2000);
  if(/\b(my child|my son|my daughter|our child|my kid|lives here|lives at|home address)\b/i.test(text))return null;
  return text;
}
function ranges(text:string):Array<{min:number;max:number}> {
  const detected:Array<{min:number;max:number}>=[];
  const regexp=/\b(?:ages?|aged|serves ages?|serving ages?|age range|children ages?)\s*:?\s*(\d{1,2})\s*(?:to|through|[-–—])\s*(\d{1,2})\b/gi;
  for(const match of text.matchAll(regexp)) {
    const min=Number(match[1]),max=Number(match[2]);
    if(Number.isInteger(min)&&Number.isInteger(max)&&min>=0&&max<=99&&min<=max)detected.push({min,max});
  }
  return detected;
}
function isRestrictedPersonalReview(url:string) {
  try {
    const u=new URL(url);const h=u.hostname.toLowerCase();
    return /(^|\.)(reddit\.com|facebook\.com|nextdoor\.com|threads\.net|yelp\.com|google\.com|instagram\.com)$/.test(h);
  } catch{return true;}
}
export function youthOrganizationRole(lead:Pick<ResolvedLead,"name"|"kind"|"evidence">):YouthOrgRole {
  const text=(lead.name+" "+lead.evidence
    .filter((item)=>!isRestrictedPersonalReview(item.url))
    .slice(0,6).map((item)=>item.title).join(" ")).toLowerCase();
  if(lead.evidence.some((item)=>item.sourceId==="co-cdec-referral-network"))
    return "potential_referral"; // Official general child-care referral/council network, not confirmed ABA referral.
  if(lead.kind==="competitor_signal"||/\b(aba clinic|aba therapy|applied behavior analysis provider|behavior analysis center)\b/i.test(text))
    return "aba_competitor";
  if(/\b(school district|elementary school|middle school|high school|preschool|child find|head start)\b/i.test(text))
    return "school_program";
  if(/\b(referral|pediatrician|speech therapy|occupational therapy|developmental pediatric|evaluation clinic|early intervention)\b/i.test(text))
    return "potential_referral";
  if(/\b(library|community resource|inclusive recreation|nonprofit support|sensory friendly)\b/i.test(text))
    return "community_resource";
  return "unclassified";
}
const PROGRAM_HINTS:ReadonlyArray<{regex:RegExp,min:number,max:number}>=[
  {regex:/\b(preschool|pre-?k|head start)\b/i,min:2,max:5},
  {regex:/\b(elementary school|primary school)\b/i,min:6,max:11},
  {regex:/\b(middle school|junior high)\b/i,min:11,max:14},
  {regex:/\b(high school|teen(?:ager)?s?|adolescents?)\b/i,min:12,max:18},
];
export function qualifyYouthLead(
  lead:Pick<ResolvedLead,"name"|"kind"|"evidence">,
  requested:YouthAgeBand="2-18",
):YouthLeadQualification {
  const band=AGE_BANDS[requested];
  const role=youthOrganizationRole(lead);
  const findings:Array<{range:{min:number;max:number};publisher:string}>=[];
  const hints=new Set<string>();
  const domains=new Set<string>();
  for(const item of lead.evidence) {
    if(isRestrictedPersonalReview(item.url))continue;
    const text=safeEvidence(item),domain=publisher(item.url);
    if(!text||!domain)continue;
    for(const range of ranges(text)) {
      findings.push({range,publisher:domain});
      if(range.min<=band.min&&range.max>=band.max)domains.add(domain);
    }
    if(PROGRAM_HINTS.some((hint)=>hint.regex.test(text)&&hint.min<=band.max&&hint.max>=band.min))
      hints.add(domain);
  }
  const covers=findings.filter((item)=>item.range.min<=band.min&&item.range.max>=band.max);
  const outside=findings.filter((item)=>item.range.max<band.min||item.range.min>band.max);
  const overlaps=findings.filter((item)=>item.range.max>=band.min&&item.range.min<=band.max);
  const ageStatus:YouthAgeStatus =
    covers.length&&outside.length?"conflicting":
    covers.length?"documented":
    findings.length&&overlaps.length?"mixed":
    findings.length?"outside":
    hints.size?"possible":"unknown";
  const uniqueRanges=[...new Map(findings.map((x)=>[x.range.min+"-"+x.range.max,x.range])).values()].slice(0,10);
  const missingChecks:string[]=[];
  if(ageStatus!=="documented")missingChecks.push(
    ageStatus==="conflicting"?"Public sources report conflicting age ranges":
    ageStatus==="outside"?"Published program range excludes requested ages":
    ageStatus==="mixed"?"Public program range overlaps but does not cover the entire selected age band":
    "Confirm the actual accepted ages on the organization's official service page",
  );
  if(role==="aba_competitor")missingChecks.push("Competing provider, not an independent referral partner");
  if(role==="unclassified"||role==="community_resource")missingChecks.push("Confirm an actual organizational pediatric referral role");
  if(domains.size<2)missingChecks.push("Age-range statement lacks a second independent publisher");
  // Age eligibility alone does not demonstrate an active/referring relationship.
  missingChecks.push("Verify the organization accepts or makes appropriate referrals");
  return {
    targetBand:requested,ageStatus,organizationRole:role,
    documentedAgeRanges:uniqueRanges,supportingPublishers:domains.size,
    ageEvidenceDomains:[...domains].sort(),missingChecks,
    qualifiedForOutreach:false,
  };
}

/** Only explicit public program age ranges can corroborate a narrower child cohort.
 * A preschool or high school keyword by itself is not proof of admission ages. */
export function publicTextCoversYouthAgeBand(text:string, requested:YouthAgeBand):boolean {
  const band=AGE_BANDS[requested];
  return ranges(text).some((range)=>range.min<=band.min && range.max>=band.max);
}

/** Each age lane maps to a specific public-institution research question. */
export function ageBandSearchQueries(band:YouthAgeBand,location:string) {
  const place=location.slice(0,90);
  const exact=band==="2-5"?"ages 2-5 preschool early intervention":
    band==="6-11"?"ages 6-11 elementary school":
    band==="12-18"?"ages 12-18 teen school-age":"ages 2-18 children school-age";
  return [
    `ABA developmental services ${exact} ${place}`,
    `pediatric therapy referral center ${exact} ${place}`,
    `special education service capacity waitlist ${exact} ${place}`,
  ];
}

export function youthLeadPriority(fit:YouthLeadQualification):number {
  const role=fit.organizationRole==="potential_referral"?15:
    fit.organizationRole==="school_program"?10:
    fit.organizationRole==="aba_competitor"?0:-6;
  const age=fit.ageStatus==="documented"?30:fit.ageStatus==="possible"?10:
    fit.ageStatus==="mixed"?2:fit.ageStatus==="conflicting"?-15:
    fit.ageStatus==="outside"?-30:0;
  return role+age+Math.min(10,fit.supportingPublishers*5);
}
