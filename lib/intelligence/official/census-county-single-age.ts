import type { CensusDemographicsResult } from "./census-demographics";
import type { IndicatorObservation } from "../phase3/indicator-catalog";

const FIPS = {MO:"29",KS:"20",CO:"08"} as const;
const NAMES = {MO:"Missouri",KS:"Kansas",CO:"Colorado"} as const;
const YEAR = 2025;
/** Published Census June 2026. Keyless bounded institutional population counts; never people or addresses. */
export function censusSingleAgeCsvUrl(state:"MO"|"KS"|"CO") {
  return "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/asrh/cc-est2025-syasex-"+FIPS[state]+".csv";
}

export interface CountyAgePopulation {
  label: string;
  counties: number;
  ages2to18: number;
  ages2to5: number;
  ages3to5: number;
  ages6to11: number;
  ages12to17: number;
  ages12to18: number;
  ages0to2: number;
  under18: number;
  totalPopulation: number;
  year: number;
  geographyKind: "county" | "state";
  sourceUrl: string;
}

function parseCsvLine(line: string): string[] {
  const values:string[]=[];
  let out="",quoted=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (ch==='"') {
      if (quoted && line[i+1]==='"') {out+='"';i++;}
      else quoted=!quoted;
    } else if (ch==="," && !quoted) {values.push(out);out="";}
    else out+=ch;
  }
  values.push(out);
  return values;
}
function norm(s:string) {
  return s.toLowerCase().replace(/\bcity and borough\b/g,"").replace(/\b(county|parish|borough|city)\b/g,"")
    .replace(/[^a-z0-9]/g," ").replace(/\s+/g," ").trim();
}
function countyTarget(location:string,state:"MO"|"KS"|"CO") {
  const stripped=location.replace(new RegExp("\\b("+NAMES[state]+"|"+state+")\\b","gi"),"")
    .replace(/[,]+/g," ").trim();
  if (!stripped || /^statewide$/i.test(stripped)) return {level:"state" as const,name:""};
  if (/\bcounty\b/i.test(stripped) || /\bsaint louis city\b/i.test(stripped)) {
    return {level:"county" as const,name:norm(stripped)};
  }
  // Do not confuse a municipality such as Kansas City with the same-named county.
  throw new Error("Single-year Census population is county/state only. Enter an explicit County or State; no city-to-county substitution.");
}

/** Strictly validates all 17 ages 2–18 and the entire 2025 official county population. */
export function parseSingleAgeCountyCsv(
  csv:string,state:"MO"|"KS"|"CO",location:string,
): CountyAgePopulation {
  const target=countyTarget(location,state);
  const lines=csv.trimStart().replace(/^\uFEFF/,"").split(/\r?\n/);
  if(lines.length<2 || lines[0].startsWith("<")) throw new Error("Official 2025 Census CSV unavailable or returned HTML");
  const columns=parseCsvLine(lines[0]).map((s)=>s.trim().toUpperCase());
  const required=["SUMLEV","STATE","COUNTY","STNAME","CTYNAME","YEAR","AGE","TOT_POP"];
  const idx=Object.fromEntries(required.map((k)=>[k,columns.indexOf(k)])) as Record<string,number>;
  for(const k of required)if(idx[k]<0)throw new Error("Official single-age CSV missing "+k);
  const selected=new Map<string,Map<number,number>>();
  const labels=new Map<string,string>();
  for(const line of lines.slice(1)) {
    if(!line.trim())continue;
    const fields=parseCsvLine(line);
    const item=(key:string)=>fields[idx[key]]?.trim() ?? "";
    if(Number(item("SUMLEV"))!==50 || item("STATE").padStart(2,"0")!==FIPS[state] ||
      Number(item("YEAR"))!==7) continue;
    const county=item("COUNTY").padStart(3,"0");
    if(!county || county==="000")continue;
    const countyName=item("CTYNAME");
    if(target.level==="county" && norm(countyName)!==target.name)continue;
    const age=Number(item("AGE")),pop=Number(item("TOT_POP"));
    if(!Number.isInteger(age)||age<0||age>85)continue;
    if(!Number.isInteger(pop)||pop<0)throw new Error("Invalid Census population record");
    const ages=selected.get(county)??new Map<number,number>();
    if(ages.has(age))throw new Error("Duplicate official Census age cell; refuse to double count");
    ages.set(age,pop);
    selected.set(county,ages);
    labels.set(county,countyName);
  }
  if(selected.size===0)throw new Error("No matching official Census 2025 county for "+location);
  const totals=new Map<number,number>();
  for(const ages of selected.values()) {
    for(let age=0;age<=85;age++) if(!ages.has(age))throw new Error("Missing Census age "+age+" from a matched county");
    for(const [age,pop] of ages)totals.set(age,(totals.get(age)??0)+pop);
  }
  const sum=(start:number,end:number)=>Array.from({length:end-start+1},(_,i)=>totals.get(start+i)??0).reduce((a,b)=>a+b,0);
  return {
    label:target.level==="state"?NAMES[state]:labels.values().next().value??location,
    counties:selected.size,year:YEAR,geographyKind:target.level,
    ages2to18:sum(2,18),ages2to5:sum(2,5),ages3to5:sum(3,5),ages6to11:sum(6,11),
    ages12to17:sum(12,17),ages12to18:sum(12,18),ages0to2:sum(0,2),
    under18:sum(0,17),totalPopulation:sum(0,85),sourceUrl:censusSingleAgeCsvUrl(state),
  };
}
export async function fetchSingleAgeCountyPopulation(input:{state:"MO"|"KS"|"CO";location:string}):Promise<CensusDemographicsResult> {
  // Reject unsupported city-level geography before using bandwidth.
  countyTarget(input.location,input.state);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try {
    const url=censusSingleAgeCsvUrl(input.state);
    const response=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{accept:"text/csv,text/plain"}});
    if(!response.ok)throw new Error("Official keyless single-age CSV returned HTTP "+response.status);
    const length=Number(response.headers.get("content-length"));
    if(Number.isFinite(length)&&length>6500000)throw new Error("Official Census CSV too large for bounded scan");
    const raw=await response.text();
    if(raw.length>6500000)throw new Error("Official Census CSV too large");
    const item=parseSingleAgeCountyCsv(raw,input.state,input.location);
    const score=(value:number,strongAt:number)=>Math.round(Math.min(100,Math.log1p(value)/Math.log1p(strongAt)*100));
    const observed=(id:string,value:number):IndicatorObservation=>({
      indicatorId:id,value,confidence:94,sourceIds:["census-county-single-age-2025"],
      capturedAt:new Date().toISOString(),
    });
    return {
      geographyName:item.label,geographyKind:item.geographyKind,year:YEAR,
      metrics:{
        totalPopulation:item.totalPopulation,under18:item.under18,age0to2:item.ages0to2,
        age3to5:item.ages3to5,age6to11:item.ages6to11,age12to17:item.ages12to17,
        under18Share:item.totalPopulation>0?item.under18/item.totalPopulation*100:0,
        under18FiveYearGrowth:null,age3to17:item.ages3to5+item.ages6to11+item.ages12to17,
        ages2to18:item.ages2to18,
        ageCohortNote:"Exact ages 2–18 from 2025 Census single-year county/state estimates; no individual children identified.",
      },
      observations:[
        observed("demographic-demand.02",score(item.ages3to5,7500)),
        observed("demographic-demand.03",score(item.ages6to11,15000)),
        observed("demographic-demand.04",score(item.ages12to17,15000)),
      ],
      sourceUrl:item.sourceUrl,
    };
  } finally {clearTimeout(timer);}
}
