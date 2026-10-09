import type { FetchText } from "../../lib/intelligence/joins/collectors";
import type { PostText } from "../../lib/intelligence/geo/places";
import { acsVars, COUNTIES, reporterPayload, type County } from "./county-joins";

// ---------------------------------------------------------------------------
// Recorded-response fixture for a Kansas City-area site (shared by verify-site-map and local render checks).
// ---------------------------------------------------------------------------
export const SITE_CENTER = { lat: 39.1, lon: -94.58 };

const template = COUNTIES[0];
export type FixtureTract = { geoid: string; lat: number; lon: number; sqmi: number; county: County };
export const FIXTURE_TRACTS: FixtureTract[] = [];
for (let row = -3; row <= 3; row++) {
  for (let col = -3; col <= 3; col++) {
    const index = FIXTURE_TRACTS.length;
    const countyFips = row >= 1 ? "047" : "095";
    const kids = 900 + ((index * 137) % 700) + (row === 0 && col === 0 ? 600 : 0);
    FIXTURE_TRACTS.push({
      geoid: "29" + countyFips + String(10000 + index * 10).padStart(6, "0"),
      lat: SITE_CENTER.lat + row * 0.03,
      lon: SITE_CENTER.lon + col * 0.038,
      sqmi: 3.2,
      county: { ...template, pop: kids * 4.4, kids, dis: 0.04 + (index % 5) * 0.01, employer: 0.45 + (index % 4) * 0.05 },
    });
  }
}

const ZCTAS = [
  { zip: "64105", lat: 39.1, lon: -94.58 },
  { zip: "64108", lat: 39.08, lon: -94.58 },
  { zip: "64111", lat: 39.06, lon: -94.59 },
  { zip: "64116", lat: 39.15, lon: -94.57 },
  { zip: "64130", lat: 39.03, lon: -94.54 },
  { zip: "64155", lat: 39.28, lon: -94.55 },
];

type NppesFixture = { orgs: Array<{ npi: string; name: string; address: string }>; individuals: number };
const NPPES: Record<string, Partial<Record<"Behavior Analyst" | "Pediatrics", NppesFixture>>> = {
  "64105": { "Behavior Analyst": { orgs: [{ npi: "1111111111", name: "HEARTLAND ABA PARTNERS LLC", address: "100 MAIN ST" }], individuals: 3 } },
  "64108": { Pediatrics: { orgs: [{ npi: "2222222222", name: "CROWN PEDIATRICS PC", address: "2400 GRAND BLVD" }], individuals: 5 } },
  "64130": { Pediatrics: { orgs: [], individuals: 2 } },
};

export const MO_CHILDCARE_FEATURES = [
  { FACILITY: "LITTLE STARS LEARNING CENTER", STATUS: "Active", DVN: "A1", ADDRESS: "12 OAK ST", CITY: "KANSAS CITY", STATE: "MO", ZIP: "64105", PHONE: "816-555-0101", MIN_AGE: "6 WKS", MAX_AGE: "12 YRS", TOTAL: 80, LATITUDE: 39.102, LONGITUDE: -94.582 },
  { FACILITY: "INCLUSIVE KIDS EARLY LEARNING", STATUS: "Active", DVN: "A2", ADDRESS: "40 ELM ST", CITY: "KANSAS CITY", STATE: "MO", ZIP: "64108", PHONE: "816-555-0102", MIN_AGE: "2 YRS", MAX_AGE: "5 YRS", TOTAL: 60, LATITUDE: 39.085, LONGITUDE: -94.575 },
  { FACILITY: "SUNRISE CHILD CARE", STATUS: "Closed", DVN: "A3", ADDRESS: "9 PINE", CITY: "KANSAS CITY", STATE: "MO", ZIP: "64111", MIN_AGE: "2 YRS", MAX_AGE: "5 YRS", TOTAL: 40, LATITUDE: 39.07, LONGITUDE: -94.6 },
  { FACILITY: "NORTHLAND INFANT CARE", STATUS: "Active", DVN: "A4", ADDRESS: "77 VIVION RD", CITY: "KANSAS CITY", STATE: "MO", ZIP: "64116", MIN_AGE: "6 WKS", MAX_AGE: "2 YRS", TOTAL: 24, LATITUDE: 39.16, LONGITUDE: -94.57 },
  { FACILITY: "TEEN CENTER AFTER SCHOOL", STATUS: "Active", DVN: "A5", ADDRESS: "5 PROSPECT", CITY: "KANSAS CITY", STATE: "MO", ZIP: "64130", MIN_AGE: "6 YRS", MAX_AGE: "12 YRS", TOTAL: 50, LATITUDE: 39.035, LONGITUDE: -94.545 },
];

export const OVERPASS_ELEMENTS = [
  { type: "node", id: 1, lat: 39.1021, lon: -94.5819, tags: { amenity: "childcare", name: "Little Stars Learning Center", website: "https://littlestars.example.org" } },
  { type: "node", id: 2, lat: 39.11, lon: -94.6, tags: { amenity: "kindergarten", name: "Bright Futures Preschool" } },
  { type: "node", id: 3, lat: 39.095, lon: -94.57, tags: { amenity: "school", name: "Garfield Elementary School" } },
  { type: "way", id: 4, center: { lat: 39.087, lon: -94.57 }, tags: { amenity: "hospital", name: "Truman Medical Center" } },
  { type: "node", id: 5, lat: 39.06, lon: -94.59, tags: { healthcare: "speech_therapist", name: "KC Speech & OT" } },
  { type: "node", id: 6, lat: 39.04, lon: -94.62, tags: { amenity: "clinic", name: "Spectrum Autism Center" } },
  { type: "node", id: 7, lat: 39.105, lon: -94.59, tags: { amenity: "childcare", name: "Grandma's Home Daycare", building: "house" } },
  { type: "node", id: 8, lat: 39.1, lon: -94.585, tags: { amenity: "childcare" } },
];

export const sitePosts: string[] = [];
export const siteGets: string[] = [];

export function siteFixtureFetch(options: { failNppes?: boolean; keylessReporter?: boolean } = {}): FetchText {
  return async (url) => {
    siteGets.push(url);
    const u = new URL(url);
    if (u.hostname === "api.censusreporter.org") {
      if (!options.keylessReporter) throw new Error("HTTP 503");
      const parent = (u.searchParams.get("geo_ids") ?? "").split("|")[1];
      // Statewide tract requests are refused, forcing the per-county fallback.
      if (parent.startsWith("04000US")) return JSON.stringify({ error: "Too many geographies requested" });
      const countyFips = parent.replace("05000US", "");
      return reporterPayload(FIXTURE_TRACTS.filter((tract) => tract.geoid.startsWith(countyFips)).map((tract) => ({
        geoid: "14000US" + tract.geoid, name: `Census Tract ${tract.geoid.slice(5)}`, values: acsVars(tract.county),
      })), (u.searchParams.get("table_ids") ?? "").split(","));
    }
    if (options.keylessReporter && u.hostname === "api.census.gov") return "<html>Invalid Key</html>";
    if (u.hostname === "api.census.gov" && u.searchParams.get("for") === "tract:*") {
      if (u.pathname.includes("/2024/")) throw new Error("HTTP 404");
      const vars = (u.searchParams.get("get") ?? "").split(",");
      return JSON.stringify([[...vars, "state", "county", "tract"], ...FIXTURE_TRACTS.map((tract) => {
        const values = acsVars(tract.county);
        return [...vars.map((name) => name === "NAME" ? `Census Tract ${tract.geoid.slice(5)}` : String(values[name] ?? "")), "29", tract.geoid.slice(2, 5), tract.geoid.slice(5)];
      })]);
    }
    if (u.hostname === "tigerweb.geo.census.gov" && u.pathname.includes("Tracts_Blocks")) {
      if (u.pathname.endsWith("/MapServer")) return JSON.stringify({ layers: [{ id: 0, name: "Census Tracts" }, { id: 1, name: "Census Block Groups" }] });
      const offset = Number(u.searchParams.get("resultOffset") ?? 0);
      const features = FIXTURE_TRACTS.slice(offset, offset + 1000).map((tract) => ({ attributes: {
        GEOID: tract.geoid, CENTLAT: "+" + tract.lat.toFixed(6), CENTLON: tract.lon.toFixed(6), AREALAND: tract.sqmi * 2_589_988.11,
      } }));
      return JSON.stringify({ features, exceededTransferLimit: false });
    }
    if (u.hostname === "tigerweb.geo.census.gov" && u.pathname.includes("ZCTA")) {
      if (u.pathname.endsWith("/MapServer")) return JSON.stringify({ layers: [{ id: 1, name: "2010 Census ZIP Code Tabulation Areas" }, { id: 2, name: "2020 Census ZIP Code Tabulation Areas" }] });
      if (!u.pathname.endsWith("/2/query")) throw new Error("ZCTA layer should be the 2020 vintage");
      return JSON.stringify({ features: ZCTAS.map((z) => ({ attributes: { ZCTA5: z.zip, CENTLAT: String(z.lat), CENTLON: String(z.lon) } })) });
    }
    if (u.hostname === "npiregistry.cms.hhs.gov") {
      if (options.failNppes) throw new Error("HTTP 503");
      const zip = u.searchParams.get("postal_code")!;
      const taxonomy = u.searchParams.get("taxonomy_description") as "Behavior Analyst" | "Pediatrics";
      const data = NPPES[zip]?.[taxonomy] ?? { orgs: [], individuals: 0 };
      const results = [
        ...data.orgs.map((org) => ({ number: org.npi, enumeration_type: "NPI-2", basic: { organization_name: org.name, status: "A" },
          addresses: [{ address_purpose: "MAILING", address_1: "PO BOX 1", city: "KANSAS CITY", state: "MO", postal_code: zip }, { address_purpose: "LOCATION", address_1: org.address, city: "KANSAS CITY", state: "MO", postal_code: zip + "1234", telephone_number: "816-555-0199" }] })),
        ...Array.from({ length: data.individuals }, (_, i) => ({ number: String(3_000_000_000 + i), enumeration_type: "NPI-1", basic: { first_name: "PRIVATE", last_name: "PERSON", status: "A" },
          addresses: [{ address_purpose: "LOCATION", address_1: "1 HOME LANE", city: "KANSAS CITY", state: "MO", postal_code: zip }] })),
      ];
      return JSON.stringify({ result_count: results.length, results });
    }
    if (u.hostname === "gis.mo.gov") {
      if (!u.searchParams.get("geometry")) throw new Error("Missouri roster must be queried by envelope");
      return JSON.stringify({ features: MO_CHILDCARE_FEATURES.map((attributes) => ({ attributes })) });
    }
    throw new Error("Unexpected fixture GET " + url);
  };
}

export const sitePostText: PostText = async (url, body) => {
  sitePosts.push(url);
  if (url.includes("overpass")) {
    if (typeof body !== "string" || !body.startsWith("data=")) throw new Error("Overpass expects form-encoded data");
    return JSON.stringify({ elements: OVERPASS_ELEMENTS });
  }
  if (url.includes("geocoding.geo.census.gov")) {
    const file = (body as FormData).get("addressFile") as Blob;
    const csv = await file.text();
    return csv.split("\n").map((line) => {
      const id = line.split(",")[0].replace(/"/g, "");
      return id.startsWith("aba_provider")
        ? `"${id}","100 MAIN ST, KANSAS CITY, MO, 64105","Match","Exact","100 MAIN ST, KANSAS CITY, MO, 64105","-94.5790,39.0990","1","L"`
        : `"${id}","input","No_Match"`;
    }).join("\n");
  }
  throw new Error("Unexpected fixture POST " + url);
};
