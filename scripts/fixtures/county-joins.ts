import assert from "node:assert/strict";
import type { FetchText } from "../../lib/intelligence/joins/collectors";

// ---------------------------------------------------------------------------
// Recorded-response fixture for a Missouri-shaped state (shared by verify-data-joins and local render checks).
// ---------------------------------------------------------------------------
export type County = {
  fips: string; name: string; pop: number; kids: number; growth: number; employer: number; medicaid: number; uninsured: number;
  pov: number; mhi: number; dis: number; cog: number; noNet: number; noCar: number; commute: number; lep: number;
  sahieUninsured?: number; brokenInsurance?: boolean; lat: number; lon: number; sqmi: number;
  cbp: Record<string, number>; childcare?: { sites: number; capacity: number; label: string };
};
const base = { growth: 0.03, employer: 0.55, medicaid: 0.3, uninsured: 0.05, pov: 0.15, mhi: 65000, dis: 0.05, cog: 0.04, noNet: 0.1, noCar: 0.06, commute: 23, lep: 0.02 };
const cbp = (mh: number, physicians: number, therapy: number, daycare: number, other = 1) => ({
  "621330": mh, "621111": physicians, "621340": therapy, "624410": daycare, "621112": other, "621420": other,
  "622110": other, "611110": other * 2, "624120": other * 3, "623210": other,
});
export const COUNTIES: County[] = [
  { ...base, fips: "29095", name: "Jackson County, Missouri", pop: 715000, kids: 160000, lat: 39.0, lon: -94.35, sqmi: 605, cbp: cbp(220, 600, 180, 260, 14), childcare: { sites: 300, capacity: 21000, label: "JACKSON" } },
  { ...base, fips: "29189", name: "St. Louis County, Missouri", pop: 1000000, kids: 220000, employer: 0.65, pov: 0.1, mhi: 78000, lat: 38.64, lon: -90.44, sqmi: 508, cbp: cbp(400, 900, 260, 320, 20), childcare: { sites: 420, capacity: 30000, label: "ST. LOUIS" } },
  { ...base, fips: "29510", name: "St. Louis city, Missouri", pop: 300000, kids: 60000, medicaid: 0.55, employer: 0.3, pov: 0.32, noCar: 0.2, mhi: 48000, lat: 38.63, lon: -90.24, sqmi: 62, cbp: cbp(150, 260, 60, 110, 8), childcare: { sites: 150, capacity: 9000, label: "ST LOUIS CITY" } },
  { ...base, fips: "29019", name: "Boone County, Missouri", pop: 185000, kids: 40000, lat: 38.99, lon: -92.31, sqmi: 685, cbp: cbp(60, 140, 50, 70, 5), childcare: { sites: 90, capacity: 6000, label: "BOONE" } },
  { ...base, fips: "29077", name: "Greene County, Missouri", pop: 300000, kids: 60000, lat: 37.26, lon: -93.34, sqmi: 675, cbp: cbp(70, 200, 70, 100, 6), childcare: { sites: 120, capacity: 8000, label: "GREENE" } },
  // Designed as the clearest service gap: big, growing child population, very few behavioral practices, federal shortage.
  { ...base, fips: "29047", name: "Clay County, Missouri", pop: 255000, kids: 64000, growth: 0.18, employer: 0.68, uninsured: 0.04, pov: 0.08, mhi: 82000, dis: 0.06, cog: 0.05, lat: 39.31, lon: -94.42, sqmi: 397, cbp: cbp(12, 210, 30, 90, 2), childcare: { sites: 60, capacity: 4000, label: "CLAY" } },
  { ...base, fips: "29213", name: "Taney County, Missouri", pop: 56000, kids: 11000, uninsured: 0.05, sahieUninsured: 14, lat: 36.65, lon: -93.04, sqmi: 632, cbp: cbp(3, 20, 4, 12, 0), childcare: { sites: 25, capacity: 1300, label: "TANEY" } },
  { ...base, fips: "29111", name: "Lewis County, Missouri", pop: 10000, kids: 2100, lat: 40.1, lon: -91.72, sqmi: 505, cbp: cbp(0, 3, 1, 2, 0), childcare: { sites: 4, capacity: 150, label: "LEWIS" } },
  { ...base, fips: "29171", name: "Putnam County, Missouri", pop: 4700, kids: 900, lat: 40.48, lon: -93.02, sqmi: 518, cbp: cbp(0, 1, 0, 1, 0) },
  { ...base, fips: "29037", name: "Cass County, Missouri", pop: 110000, kids: 26000, brokenInsurance: true, lat: 38.65, lon: -94.35, sqmi: 699, cbp: cbp(18, 60, 15, 40, 2), childcare: { sites: 55, capacity: 3600, label: "CASS" } },
];
export const byFips = new Map(COUNTIES.map((county) => [county.fips, county]));

export function acsVars(c: County): Record<string, number> {
  const k = c.kids;
  const u3 = Math.round(k * 0.16), a34 = Math.round(k * 0.11), u6 = Math.round(k * 0.32), a5 = u6 - u3 - a34;
  const older = k - u6, q = Math.floor(older / 4);
  const hh = Math.round(c.pop / 2.5);
  const u19 = Math.round(k * (c.brokenInsurance ? 0.3 : 1.05));
  const m517 = Math.round((older + u6 / 6) * 0.51), f517 = Math.round((older + u6 / 6) * 0.49);
  const mu5 = Math.round(u6 * 0.42), fu5 = Math.round(u6 * 0.41);
  return {
    B01003_001E: c.pop, B09001_001E: k, B09001_003E: u3, B09001_004E: a34, B09001_005E: a5,
    B09001_006E: q, B09001_007E: q, B09001_008E: q, B09001_009E: older - 3 * q,
    B11005_001E: hh, B11005_002E: Math.round(hh * 0.3),
    B27010_002E: u19, B27010_004E: Math.round(u19 * c.employer), B27010_007E: Math.round(u19 * c.medicaid), B27010_017E: Math.round(u19 * c.uninsured),
    B17020_003E: Math.round(k * c.pov / 3), B17020_004E: Math.round(k * c.pov / 3), B17020_005E: Math.round(k * c.pov / 3),
    B17020_011E: Math.round(k * (1 - c.pov) * 0.98 / 3), B17020_012E: Math.round(k * (1 - c.pov) * 0.98 / 3), B17020_013E: Math.round(k * (1 - c.pov) * 0.98 / 3),
    B19013_001E: c.mhi, B19125_002E: Math.round(c.mhi * 1.2),
    B18101_003E: mu5, B18101_004E: Math.round(mu5 * 0.01), B18101_006E: m517, B18101_007E: Math.round(m517 * c.dis),
    B18101_022E: fu5, B18101_023E: Math.round(fu5 * 0.008), B18101_025E: f517, B18101_026E: Math.round(f517 * c.dis * 0.6),
    B18104_003E: m517, B18104_004E: Math.round(m517 * c.cog), B18104_019E: f517, B18104_020E: Math.round(f517 * c.cog * 0.6),
    B28002_001E: hh, B28002_013E: Math.round(hh * c.noNet), B08201_001E: hh, B08201_002E: Math.round(hh * c.noCar),
    B08013_001E: Math.round(c.pop * 0.45 * c.commute), B08303_001E: Math.round(c.pop * 0.45),
    C16002_001E: hh, C16002_004E: Math.round(hh * c.lep * 0.6), C16002_007E: Math.round(hh * c.lep * 0.4 / 3),
    C16002_010E: Math.round(hh * c.lep * 0.4 / 3), C16002_013E: Math.round(hh * c.lep * 0.4 / 3),
    B23008_002E: u6, B23008_004E: Math.round(u6 * 0.4), B23008_010E: Math.round(u6 * 0.03), B23008_013E: Math.round(u6 * 0.15),
  };
}

const table = (header: string[], rows: Array<Array<string | number>>) => JSON.stringify([header, ...rows.map((row) => row.map(String))]);
export const requested: string[] = [];

/** Census Reporter /data/show payload built from Census-API-style variable values. */
export function reporterPayload(geos: Array<{ geoid: string; name: string; values: Record<string, number> }>, tables: string[]) {
  const data: Record<string, Record<string, { estimate: Record<string, number> }>> = {};
  const geography: Record<string, { name: string }> = {};
  for (const geo of geos) {
    geography[geo.geoid] = { name: geo.name };
    data[geo.geoid] = {};
    for (const [variable, value] of Object.entries(geo.values)) {
      const table = variable.split("_")[0];
      if (!tables.includes(table)) continue;
      (data[geo.geoid][table] ??= { estimate: {} }).estimate[table + variable.split("_")[1].replace("E", "")] = value;
    }
  }
  return JSON.stringify({ release: { id: "acs2023_5yr", years: "2019-2023" }, geography, data });
}

export function fixtureFetch(stateFips: string, overrides: { failHpsa?: boolean; hangAll?: boolean; keylessReporter?: boolean } = {}): FetchText {
  return async (url, signal) => {
    requested.push(url);
    if (overrides.hangAll) {
      if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    }
    const u = new URL(url);
    const counties = COUNTIES.map((county) => ({ ...county, fips: stateFips + county.fips.slice(2) }));
    if (u.hostname === "api.censusreporter.org") {
      if (!overrides.keylessReporter) throw new Error("HTTP 503");
      const prior = u.pathname.endsWith("/acs2019_5yr");
      assert.equal(u.searchParams.get("geo_ids"), `050|04000US${stateFips}`);
      return reporterPayload(counties.map((c) => {
        const values = acsVars(byFips.get("29" + c.fips.slice(2))!);
        if (prior) values.B09001_001E = Math.round(c.kids / (1 + c.growth));
        return { geoid: "05000US" + c.fips, name: c.name.replace(", Missouri", ", MO"), values };
      }), (u.searchParams.get("table_ids") ?? "").split(","));
    }
    if (overrides.keylessReporter && u.hostname === "api.census.gov") return "<html><body>Invalid Key</body></html>";
    if (u.hostname === "api.census.gov") {
      assert.equal(u.searchParams.get("in"), `state:${stateFips}`);
      const vars = (u.searchParams.get("get") ?? "").split(",");
      if (u.pathname.includes("/2024/acs/")) throw new Error("HTTP 404");
      if (u.pathname.includes("/2023/cbp")) throw new Error("HTTP 400");
      if (u.pathname.endsWith("/acs/acs5")) {
        const prior = u.pathname.includes("/2019/");
        return table([...vars, "state", "county"], counties.map((c) => {
          const values = acsVars(byFips.get("29" + c.fips.slice(2))!);
          if (prior) values.B09001_001E = Math.round(c.kids / (1 + c.growth));
          return [...vars.map((name) => name === "NAME" ? c.name : values[name] ?? ""), stateFips, c.fips.slice(2)];
        }));
      }
      if (u.pathname.endsWith("/poverty/saipe")) {
        return table(["NAME", "SAEPOVRT0_17_PT", "SAEMHI_PT", "time", "state", "county"],
          counties.map((c) => [c.name.split(",")[0], (c.pov * 100).toFixed(1), c.mhi, u.searchParams.get("time")!, stateFips, c.fips.slice(2)]));
      }
      if (u.pathname.endsWith("/healthins/sahie")) {
        assert.equal(u.searchParams.get("AGECAT"), "4", "SAHIE must request children under 19");
        return table(["NAME", "NIC_PT", "NUI_PT", "PCTUI_PT", "time", "AGECAT", "IPRCAT", "SEXCAT", "RACECAT", "state", "county"],
          counties.map((c) => {
            const rate = c.sahieUninsured ?? c.uninsured * 100 + 0.4;
            const u19 = Math.round(c.kids * 1.06);
            return [c.name, Math.round(u19 * (1 - rate / 100)), Math.round(u19 * rate / 100), rate.toFixed(1), "2023", "4", "0", "0", "0", stateFips, c.fips.slice(2)];
          }));
      }
      if (u.pathname.endsWith("/cbp")) {
        assert(u.pathname.includes("/2022/") && u.searchParams.has("NAICS2017"), "CBP falls back to 2022 / NAICS2017");
        const naics = u.searchParams.get("NAICS2017")!;
        const rows = counties.filter((c) => (c.cbp[naics] ?? 0) > 0).map((c) => [c.name, c.cbp[naics], naics, stateFips, c.fips.slice(2)]);
        if (naics === "621330") rows.push([counties[0].name, 5, naics, stateFips, counties[0].fips.slice(2)]);
        return table(["NAME", "ESTAB", "NAICS2017", "state", "county"], rows);
      }
    }
    if (u.hostname === "tigerweb.geo.census.gov") {
      if (u.pathname.endsWith("/MapServer")) return JSON.stringify({ layers: [{ id: 0, name: "States" }, { id: 11, name: "Counties" }] });
      assert(u.pathname.endsWith("/MapServer/11/query"), "TIGER layer is discovered by name");
      return JSON.stringify({ features: counties.map((c) => ({ attributes: {
        GEOID: c.fips, NAME: c.name.split(",")[0], AREALAND: c.sqmi * 2_589_988.11, CENTLAT: "+" + c.lat, CENTLON: String(c.lon),
      } })) });
    }
    if (u.hostname === "data.hrsa.gov") {
      if (overrides.failHpsa) throw new Error("HTTP 503");
      const s = stateFips;
      return [
        '﻿HPSA Name,Designation Type,HPSA Discipline Class,HPSA Score,HPSA Status,Common State County FIPS Code',
        `"Clay County, MO",Geographic HPSA,Mental Health,18,Designated,${s}047`,
        `Taney County,High Needs Geographic HPSA,Mental Health,21,Designated,${s}213`,
        `Lewis County,HPSA Population,Mental Health,16,Proposed For Withdrawal,${s}111`,
        `Jackson FQHC,Federally Qualified Health Center,Mental Health,22,Designated,${s}095`,
        `Greene County,Geographic HPSA,Mental Health,19,Withdrawn,${s}077`,
        `Other State County,Geographic HPSA,Mental Health,25,Designated,99001`,
      ].join("\r\n");
    }
    if (u.hostname === "gis.mo.gov") {
      assert.equal(u.searchParams.get("groupByFieldsForStatistics"), "COUNTY,STATUS");
      return JSON.stringify({ features: [
        ...counties.filter((c) => c.childcare).map((c) => ({ attributes: { COUNTY: c.childcare!.label, STATUS: "Active", SITES: c.childcare!.sites, CAPACITY: c.childcare!.capacity } })),
        { attributes: { COUNTY: "JACKSON", STATUS: "Closed", SITES: 50, CAPACITY: 4000 } },
      ] });
    }
    throw new Error("Unexpected fixture URL " + url);
  };
}
