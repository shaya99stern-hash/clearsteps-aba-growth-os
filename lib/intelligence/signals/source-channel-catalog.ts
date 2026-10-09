import { EXPANDED_PUBLIC_SOURCE_CHANNELS } from "./expanded-source-channels";
import { ADDITIONAL_YOUTH_SOURCE_CHANNELS } from "./additional-youth-source-channels";
import type { LeadEngine } from "../phase3/indicator-catalog";
export interface PublicSourceChannel {
  host: string;
  scope: "MO" | "KS" | "CO" | "federal" | "national";
  kind: string;
  method: "site-search";
  focus?: string;
  access?: "public-index" | "aggregate-only";
}
/** Sites are discoverable candidates, not claims of an active integration or confirmed hits. */
const ORIGINAL_PUBLIC_SOURCE_CHANNELS: readonly PublicSourceChannel[] = [
  {
    "host": "census.gov",
    "scope": "federal",
    "kind": "demographic",
    "method": "site-search"
  },
  {
    "host": "data.census.gov",
    "scope": "federal",
    "kind": "demographic",
    "method": "site-search"
  },
  {
    "host": "cdc.gov",
    "scope": "federal",
    "kind": "population",
    "method": "site-search"
  },
  {
    "host": "medicaid.gov",
    "scope": "federal",
    "kind": "payer",
    "method": "site-search"
  },
  {
    "host": "cms.gov",
    "scope": "federal",
    "kind": "payer",
    "method": "site-search"
  },
  {
    "host": "npiregistry.cms.hhs.gov",
    "scope": "federal",
    "kind": "provider",
    "method": "site-search"
  },
  {
    "host": "hrsa.gov",
    "scope": "federal",
    "kind": "provider",
    "method": "site-search"
  },
  {
    "host": "bls.gov",
    "scope": "federal",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "onetonline.org",
    "scope": "federal",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "ed.gov",
    "scope": "federal",
    "kind": "education",
    "method": "site-search"
  },
  {
    "host": "sites.ed.gov",
    "scope": "federal",
    "kind": "education",
    "method": "site-search"
  },
  {
    "host": "headstart.gov",
    "scope": "federal",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "childcare.gov",
    "scope": "federal",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "acf.hhs.gov",
    "scope": "federal",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "usaspending.gov",
    "scope": "federal",
    "kind": "grants",
    "method": "site-search"
  },
  {
    "host": "grants.gov",
    "scope": "federal",
    "kind": "grants",
    "method": "site-search"
  },
  {
    "host": "sam.gov",
    "scope": "federal",
    "kind": "contracts",
    "method": "site-search"
  },
  {
    "host": "data.gov",
    "scope": "federal",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "nih.gov",
    "scope": "federal",
    "kind": "research",
    "method": "site-search"
  },
  {
    "host": "health.mo.gov",
    "scope": "MO",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "mydss.mo.gov",
    "scope": "MO",
    "kind": "payer",
    "method": "site-search"
  },
  {
    "host": "dese.mo.gov",
    "scope": "MO",
    "kind": "education",
    "method": "site-search"
  },
  {
    "host": "pr.mo.gov",
    "scope": "MO",
    "kind": "license",
    "method": "site-search"
  },
  {
    "host": "labor.mo.gov",
    "scope": "MO",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "gis.mo.gov",
    "scope": "MO",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "revisor.mo.gov",
    "scope": "MO",
    "kind": "rules",
    "method": "site-search"
  },
  {
    "host": "house.mo.gov",
    "scope": "MO",
    "kind": "legislation",
    "method": "site-search"
  },
  {
    "host": "sos.mo.gov",
    "scope": "MO",
    "kind": "organization",
    "method": "site-search"
  },
  {
    "host": "jobs.mo.gov",
    "scope": "MO",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "kdhe.ks.gov",
    "scope": "KS",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "ksde.gov",
    "scope": "KS",
    "kind": "education",
    "method": "site-search"
  },
  {
    "host": "dcf.ks.gov",
    "scope": "KS",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "ksbha.ks.gov",
    "scope": "KS",
    "kind": "license",
    "method": "site-search"
  },
  {
    "host": "ksrevisor.gov",
    "scope": "KS",
    "kind": "rules",
    "method": "site-search"
  },
  {
    "host": "kslegislature.gov",
    "scope": "KS",
    "kind": "legislation",
    "method": "site-search"
  },
  {
    "host": "kansasworks.com",
    "scope": "KS",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "kancare.ks.gov",
    "scope": "KS",
    "kind": "payer",
    "method": "site-search"
  },
  {
    "host": "ku.edu",
    "scope": "KS",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "cdec.colorado.gov",
    "scope": "CO",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "data.colorado.gov",
    "scope": "CO",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "hcpf.colorado.gov",
    "scope": "CO",
    "kind": "payer",
    "method": "site-search"
  },
  {
    "host": "cdhs.colorado.gov",
    "scope": "CO",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "cde.state.co.us",
    "scope": "CO",
    "kind": "education",
    "method": "site-search"
  },
  {
    "host": "cdle.colorado.gov",
    "scope": "CO",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "dora.colorado.gov",
    "scope": "CO",
    "kind": "license",
    "method": "site-search"
  },
  {
    "host": "leg.colorado.gov",
    "scope": "CO",
    "kind": "legislation",
    "method": "site-search"
  },
  {
    "host": "cdphe.colorado.gov",
    "scope": "CO",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "colorado.gov",
    "scope": "CO",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "bacb.com",
    "scope": "national",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "abainternational.org",
    "scope": "national",
    "kind": "research",
    "method": "site-search"
  },
  {
    "host": "autism-society.org",
    "scope": "national",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "autismspeaks.org",
    "scope": "national",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "aap.org",
    "scope": "national",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "asha.org",
    "scope": "national",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "aota.org",
    "scope": "national",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "naeyc.org",
    "scope": "national",
    "kind": "referral",
    "method": "site-search"
  },
  {
    "host": "easterseals.com",
    "scope": "national",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "unitedway.org",
    "scope": "national",
    "kind": "program",
    "method": "site-search"
  },
  {
    "host": "denverpost.com",
    "scope": "CO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "coloradosun.com",
    "scope": "CO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "cpr.org",
    "scope": "CO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "chalkbeat.org",
    "scope": "CO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "kansasreflector.com",
    "scope": "KS",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "kansascity.com",
    "scope": "KS",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "kcur.org",
    "scope": "KS",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "stltoday.com",
    "scope": "MO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "missouriindependent.com",
    "scope": "MO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "stlpublicradio.org",
    "scope": "MO",
    "kind": "press",
    "method": "site-search"
  },
  {
    "host": "reddit.com",
    "scope": "national",
    "kind": "community",
    "method": "site-search"
  },
  {
    "host": "facebook.com",
    "scope": "national",
    "kind": "community",
    "method": "site-search"
  },
  {
    "host": "nextdoor.com",
    "scope": "national",
    "kind": "community",
    "method": "site-search"
  },
  {
    "host": "threads.net",
    "scope": "national",
    "kind": "community",
    "method": "site-search"
  },
  {
    "host": "indeed.com",
    "scope": "national",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "linkedin.com",
    "scope": "national",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "ziprecruiter.com",
    "scope": "national",
    "kind": "workforce",
    "method": "site-search"
  },
  {
    "host": "glassdoor.com",
    "scope": "national",
    "kind": "workforce",
    "method": "site-search"
  }
];

/** Candidate publisher hostnames, NOT 274 live adapters or 274 proven independent sources. */
export const PUBLIC_SOURCE_CHANNELS: readonly PublicSourceChannel[] = [
  ...ORIGINAL_PUBLIC_SOURCE_CHANNELS,
  ...EXPANDED_PUBLIC_SOURCE_CHANNELS,
  ...ADDITIONAL_YOUTH_SOURCE_CHANNELS,
];

function relevant(item: PublicSourceChannel, engine: LeadEngine) {
  if (engine === "client") return !["workforce", "contracts", "context"].includes(item.kind);
  return ["workforce", "license", "education", "rules", "press", "research", "legislation", "organization"].includes(item.kind);
}
/** Deterministic rotation allows later runs to investigate different registered public sources. */
export function choosePublicSourceChannels(
  state: "MO" | "KS" | "CO", engine: LeadEngine, location: string, max = 8, rotation = 0,
): PublicSourceChannel[] {
  const local = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope===state && relevant(item,engine));
  const federal = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope==="federal" && relevant(item,engine));
  const national = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope==="national" && relevant(item,engine));
  const newLocal = ADDITIONAL_YOUTH_SOURCE_CHANNELS.filter((item) => item.scope === state && relevant(item, engine));
  const newBroad = ADDITIONAL_YOUTH_SOURCE_CHANNELS.filter((item) =>
    ["national", "federal"].includes(item.scope) && relevant(item, engine));
  const seed = [...location.toLowerCase()].reduce((value,char)=>((value*31)+char.charCodeAt(0))>>>0,17) +
    Math.max(0, Math.floor(rotation)) * 101;
  const rotated=(entries: PublicSourceChannel[],number:number,offset:number)=>
    entries.length ? Array.from({length:Math.min(number,entries.length)},(_,i)=>entries[(seed+offset+i)%entries.length]) : [];
  return [...new Map([
    ...rotated(newLocal,Math.min(1,max),31),
    ...rotated(newBroad,Math.min(1,Math.max(0,max-1)),47),
    ...rotated(local,Math.ceil(max * 0.5),0),
    ...rotated(federal,Math.max(1,Math.floor(max * 0.25)),7),
    ...rotated(national,Math.max(1,Math.floor(max * 0.25)),19),
  ].map((item)=>[item.host,item] as const)).values()].slice(0,max);
}
export function queryForPublicSource(channel:PublicSourceChannel,location:string,engine:LeadEngine) {
  const term=channel.kind==="press"?"ABA services waitlist therapy":
    channel.kind==="workforce"?(engine==="bcba"?"BCBA behavior analyst hiring":"RBT behavior technician hiring"):
    channel.kind==="education"?"early intervention child find":
    channel.kind==="payer"?"ABA Medicaid provider network":
    channel.kind==="community"?"public regional youth service availability programs":
    channel.kind==="license"?"behavior analyst licensing professional":
    channel.kind==="demographic"?"children ages 2 to 18 population county":
    "pediatric developmental services ages 2-18 referral organizations";
  return "site:"+channel.host+" "+(channel.focus ?? term)+" "+location;
}
export function matchedPublicSourceChannels(urls:readonly string[]) {
  const matched=new Set<string>();
  for(const value of urls) {
    let hostname:string;
    try {hostname=new URL(value).hostname.replace(/^www\./,"").toLowerCase();}
    catch {continue;}
    // A subdomain belongs to its most specific registered channel only.
    // Do not count cdec.colorado.gov and colorado.gov as two independent sources.
    const matches=PUBLIC_SOURCE_CHANNELS.filter((channel) =>
      hostname===channel.host || hostname.endsWith("."+channel.host)
    ).sort((a,b)=>b.host.length-a.host.length);
    if(matches[0])matched.add(matches[0].host);
  }
  return [...matched].sort();
}

/** Aggregate-only publishers may inform public market context but never seed CRM records. */
export function isAggregateOnlyPublicSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return ADDITIONAL_YOUTH_SOURCE_CHANNELS.some((channel) =>
      channel.access === "aggregate-only" &&
      (host === channel.host || host.endsWith("." + channel.host))
    );
  } catch {
    return false;
  }
}
