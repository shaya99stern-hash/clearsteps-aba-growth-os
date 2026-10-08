import type { LeadEngine } from "../phase3/indicator-catalog";
export interface PublicSourceChannel {
  host: string;
  scope: "MO" | "KS" | "CO" | "federal" | "national";
  kind: string;
  method: "site-search";
}
/** Sites are discoverable candidates, not claims of an active integration or confirmed hits. */
export const PUBLIC_SOURCE_CHANNELS: readonly PublicSourceChannel[] = [
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

function relevant(item: PublicSourceChannel, engine: LeadEngine) {
  if (engine === "client") return item.kind !== "workforce" && item.kind !== "contracts";
  return ["workforce", "license", "education", "rules", "press", "research", "legislation"].includes(item.kind);
}
/** Deterministic rotation allows later runs to investigate different registered public sources. */
export function choosePublicSourceChannels(
  state: "MO" | "KS" | "CO", engine: LeadEngine, location: string, max = 5,
): PublicSourceChannel[] {
  const local = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope===state && relevant(item,engine));
  const federal = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope==="federal" && relevant(item,engine));
  const national = PUBLIC_SOURCE_CHANNELS.filter((item)=>item.scope==="national" && relevant(item,engine));
  const seed=[...location.toLowerCase()].reduce((value,char)=>((value*31)+char.charCodeAt(0))>>>0,17);
  const rotated=(entries: PublicSourceChannel[],number:number,offset:number)=>
    entries.length ? Array.from({length:Math.min(number,entries.length)},(_,i)=>entries[(seed+offset+i)%entries.length]) : [];
  return [...new Map([
    ...rotated(local,Math.ceil(max/2),0),
    ...rotated(federal,1,1),
    ...rotated(national,Math.floor(max/2),3),
  ].map((item)=>[item.host,item] as const)).values()].slice(0,max);
}
export function queryForPublicSource(channel:PublicSourceChannel,location:string,engine:LeadEngine) {
  const term=channel.kind==="press"?"ABA services waitlist therapy":
    channel.kind==="workforce"?(engine==="bcba"?"BCBA behavior analyst hiring":"RBT behavior technician hiring"):
    channel.kind==="education"?"early intervention child find":
    channel.kind==="payer"?"ABA Medicaid provider network":
    channel.kind==="community"?"ABA therapy services resources":
    channel.kind==="license"?"behavior analyst licensing professional":
    "child developmental services referral";
  return "site:"+channel.host+" "+term+" "+location;
}
export function matchedPublicSourceChannels(urls:readonly string[]) {
  const matched=new Set<string>();
  for(const value of urls) {
    let hostname:string;
    try {hostname=new URL(value).hostname.replace(/^www\./,"").toLowerCase();}
    catch {continue;}
    for(const channel of PUBLIC_SOURCE_CHANNELS) {
      if(hostname===channel.host || hostname.endsWith("."+channel.host))matched.add(channel.host);
    }
  }
  return [...matched].sort();
}
