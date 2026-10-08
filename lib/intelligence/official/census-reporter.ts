import type { CensusDemographicsResult } from "./census-demographics";
import type { IndicatorObservation } from "../phase3/indicator-catalog";

/** Keyless public ACS distribution via Census Reporter. No user credentials. */
const ROOT = "https://api.censusreporter.org/1.0";
const STATE_FIPS = { MO: "29", KS: "20", CO: "08" } as const;
const STATE_SUFFIX = { MO: ", MO", KS: ", KS", CO: ", CO" } as const;
const YEAR = 2024;

type Geo = { full_geoid: string; full_name: string; sumlevel: string };
type ReporterData = {
  release?: { years?: string };
  geography?: Record<string, { name?: string }>;
  data?: Record<string, Record<string, { estimate?: Record<string, number | null> }>>;
};

async function publicJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("Public ACS mirror returned HTTP " + response.status);
    const raw = await response.text();
    if (!raw.trimStart().startsWith("{")) throw new Error("Public ACS mirror returned non-JSON content");
    return JSON.parse(raw) as unknown;
  } finally { clearTimeout(timer); }
}

function normalize(name: string) {
  return name.toLowerCase().replace(/\b(city|town|village|municipality)\b/g, "").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function scoreGeo(geo: Geo, wanted: string, state: "MO"|"KS"|"CO", expectedLevel: string) {
  if (geo.sumlevel !== expectedLevel || !geo.full_name.endsWith(STATE_SUFFIX[state])) return 0;
  const candidate=normalize(geo.full_name.split(",")[0].replace(/\bcounty\b/gi,""));
  const request=normalize(wanted.replace(/\bcounty\b/gi,""));
  if (candidate === request) return 100;
  if (candidate.startsWith(request+" ") || request.startsWith(candidate+" ")) return 55;
  return 0;
}
export function chooseCensusReporterGeo(
  result: unknown, wanted: string, state: "MO"|"KS"|"CO", expectedLevel: string,
): Geo | null {
  if (!result || typeof result !== "object" || !("results" in result)) return null;
  const geos = (result as {results?: Geo[]}).results;
  if (!Array.isArray(geos)) return null;
  const ranked=geos.map(geo=>({geo,score:scoreGeo(geo,wanted,state,expectedLevel)})).sort((a,b)=>b.score-a.score);
  return ranked[0]?.score === 100 ? ranked[0].geo : null;
}
export async function resolveCensusReporterGeo(state: "MO"|"KS"|"CO", location: string) {
  const cleaned=location.replace(new RegExp("\\b("+({MO:"Missouri|MO",KS:"Kansas|KS",CO:"Colorado|CO"}[state])+")\\b","gi"),"").replace(/[,]+/g," ").trim();
  const zip=cleaned.match(/\b\d{5}\b/)?.[0];
  if (zip) return { geoid:"86000US"+zip, kind:"zcta" as const };
  if (!cleaned || /^statewide$/i.test(cleaned)) return {geoid:"04000US"+STATE_FIPS[state],kind:"state" as const};
  const county=/\bcounty\b/i.test(cleaned);
  const wanted=cleaned.replace(/\bcounty\b/gi,"").trim();
  const params=new URLSearchParams({q:wanted, sumlevs:county?"050":"160"});
  const result=await publicJson(ROOT+"/geo/search?"+params.toString());
  const geo=chooseCensusReporterGeo(result,wanted,state,county?"050":"160");
  if (!geo) throw new Error("Unrecognized local ACS geography: "+location+". Enter an exact city, county or five-digit ZIP.");
  return {geoid:geo.full_geoid,kind:county?"county" as const:"place" as const};
}

export function parseCensusReporterData(raw: unknown, geoid: string) {
  const payload=raw as ReporterData;
  const estimate=payload?.data?.[geoid];
  const b09001=estimate?.B09001?.estimate;
  const b01003=estimate?.B01003?.estimate;
  if (!b09001 || !b01003) throw new Error("Public ACS mirror did not provide complete B09001 and B01003 tables");
  function count(table:Record<string,number|null>, id:string):number {
    const value=table[id];
    if (typeof value !== "number" || !Number.isFinite(value) || value<0) throw new Error("Missing or suppressed Census estimate: "+id);
    return Math.round(value);
  }
  const totalPopulation=count(b01003,"B01003001");
  const under18=count(b09001,"B09001001");
  const age0to2=count(b09001,"B09001003");
  const age3to5=count(b09001,"B09001004")+count(b09001,"B09001005");
  const age6to11=count(b09001,"B09001006")+count(b09001,"B09001007");
  const age12to17=count(b09001,"B09001008")+count(b09001,"B09001009");
  if (under18 > totalPopulation) throw new Error("Impossible ACS age totals; rejecting source record");
  return {
    name:payload?.geography?.[geoid]?.name ?? geoid,
    metrics: {totalPopulation,under18,age0to2,age3to5,age6to11,age12to17,
      under18Share:totalPopulation>0?under18/totalPopulation*100:0,under18FiveYearGrowth:null},
  };
}

export async function fetchCensusReporterDemographics(
  input:{state:"MO"|"KS"|"CO";location:string},
): Promise<CensusDemographicsResult> {
  const geo=await resolveCensusReporterGeo(input.state,input.location);
  const url=ROOT+"/data/show/acs2024_5yr?"+new URLSearchParams({table_ids:"B09001,B01003",geo_ids:geo.geoid});
  const result=parseCensusReporterData(await publicJson(url),geo.geoid);
  const m=result.metrics;
  const now=new Date().toISOString();
  const score=(value:number,strongAt:number)=>Math.max(0,Math.min(100,Math.round(Math.log1p(value)/Math.log1p(strongAt)*100)));
  const observation=(id:string,value:number):IndicatorObservation=>({
    indicatorId:id,value,confidence:85,sourceIds:["census-reporter-acs2024-5yr"],capturedAt:now,
  });
  return {
    geographyName:result.name,
    geographyKind:geo.kind,
    year:YEAR,
    metrics:m,
    observations:[
      observation("demographic-demand.01",score(m.age0to2,7500)),
      observation("demographic-demand.02",score(m.age3to5,7500)),
      observation("demographic-demand.03",score(m.age6to11,15000)),
      observation("demographic-demand.04",score(m.age12to17,15000)),
      observation("demographic-demand.05",Math.max(0,Math.min(100,Math.round((m.under18Share-12)/18*100)))),
    ],
    sourceUrl:"https://censusreporter.org/",
  };
}
