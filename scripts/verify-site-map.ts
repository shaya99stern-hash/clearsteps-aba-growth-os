import assert from "node:assert/strict";
import { collectSitePlaces, mergePlaces, parseAgeYears, parseColoradoChildCarePlaces, parseGeocoderBatch, parseNppesZip, parseOverpassPlaces, samePlace, zctaLayerId, type MapPlace } from "../lib/intelligence/geo/places";
import { collectStateTracts, parseTigerTractPage, tractHotspots } from "../lib/intelligence/geo/tracts";
import { analyzeSite, assessDaycare, CDC_AUTISM_PREVALENCE, formatAgeRange, tractWeight } from "../lib/intelligence/geo/site-analysis";
import { circlePolygon, haversineMiles, insideState } from "../lib/intelligence/geo/geo-math";
import { FIXTURE_TRACTS, OVERPASS_ELEMENTS, SITE_CENTER, siteFixtureFetch, sitePostText } from "./fixtures/site-map";
import { fixtureFetch } from "./fixtures/county-joins";
import { collectStateCountyBundle } from "../lib/intelligence/joins/collectors";
import { rankStateCounties } from "../lib/intelligence/joins/rank";

async function main() {
  // --- Geometry ---------------------------------------------------------------
  assert(Math.abs(haversineMiles({ lat: 39.1, lon: -94.58 }, { lat: 38.63, lon: -90.2 }) - 237) < 5, "KC → St. Louis ≈ 237 mi");
  assert.equal(tractWeight(0, 2, 1), 1, "Small tract at the center is fully inside");
  assert.equal(tractWeight(20, 2, 1), 0);
  const partial = tractWeight(2, 2, 3);
  assert(partial > 0 && partial < 1, "Edge tract is partially counted");
  assert(tractWeight(0, 2, 400) < 0.05, "A 400 sq mi rural tract contributes only the circle's share");
  for (const d of [0, 0.5, 1, 1.5, 2, 2.5, 3, 4]) assert(tractWeight(d, 5, 2) >= tractWeight(d, 2, 2), "Larger radius never counts less");
  assert.equal(circlePolygon(SITE_CENTER, 2).length, 73);
  assert(insideState("MO", SITE_CENTER) && !insideState("CO", SITE_CENTER));

  // --- Parsers ----------------------------------------------------------------
  assert.equal(parseAgeYears("6 WKS"), 0.12);
  assert.equal(parseAgeYears("2 YRS 6 MOS"), 2.5);
  assert.equal(parseAgeYears("12"), 12);
  assert.equal(parseAgeYears("unknown"), null);
  assert.equal(formatAgeRange(0.12, 12), "6 wks–12 yrs");
  assert.equal(formatAgeRange(2.5, 5), "2.5 yrs–5 yrs");
  assert.equal(zctaLayerId({ layers: [{ id: 1, name: "2010 Census ZIP Code Tabulation Areas" }, { id: 2, name: "2020 Census ZIP Code Tabulation Areas" }] }), 2);
  const osm = parseOverpassPlaces({ elements: OVERPASS_ELEMENTS });
  assert(!osm.some((place) => place.name.includes("Grandma")), "Facilities mapped as houses are never used");
  assert.equal(osm.length, 6, "Unnamed features are dropped");
  assert.equal(osm.find((place) => place.name === "Spectrum Autism Center")?.kind, "aba_provider");
  assert.equal(osm.find((place) => place.name === "Truman Medical Center")?.lat, 39.087, "Ways use their center point");
  assert.equal(osm.find((place) => place.name === "KC Speech & OT")?.kind, "therapy");
  const nppes = parseNppesZip({ result_count: 2, results: [
    { number: "1", enumeration_type: "NPI-2", basic: { organization_name: "A ABA" }, addresses: [{ address_purpose: "MAILING", address_1: "PO" }, { address_purpose: "LOCATION", address_1: "1 St", city: "KC", state: "MO", postal_code: "641051234" }] },
    { number: "2", enumeration_type: "NPI-1", basic: {}, addresses: [{ address_purpose: "LOCATION", address_1: "home" }] },
    { number: "3", enumeration_type: "NPI-2", basic: { organization_name: "Gone", status: "D" }, addresses: [] },
  ] });
  assert.deepEqual(nppes.organizations.map((org) => [org.address, org.zip]), [["1 St", "64105"]], "Location address, 5-digit ZIP, deactivated excluded");
  assert.equal(nppes.individuals, 1, "Individuals are counted, not listed");
  assert.throws(() => parseNppesZip({}), /result_count/);
  assert.deepEqual([...parseGeocoderBatch('"a","x","Match","Exact","y","-94.5,39.1","1","L"\n"b","x","No_Match"')], [["a", { lat: 39.1, lon: -94.5 }]]);
  const co = parseColoradoChildCarePlaces([
    { provider_id: "9", provider_name: "Denver Public Schools ECE", zip: "80202", total_licensed_capacity: "120", school_district_operated_program: true },
    { provider_id: "10", provider_name: "No Zip Care" },
  ], new Map([["80202", { lat: 39.75, lon: -104.99 }]]));
  assert.equal(co.length, 1);
  assert(co[0].approximate && co[0].schoolDistrictOperated && co[0].inclusionSignals.includes("school-district operated"));
  const tigerPage = parseTigerTractPage({ features: Array.from({ length: 1000 }, (_, i) => ({ attributes: { GEOID: "29095" + String(i).padStart(6, "0"), CENTLAT: "39", CENTLON: "-94", AREALAND: 1e6 } })) }, "29");
  assert(tigerPage.more && tigerPage.rows.length === 1000, "Full page signals another page");
  const a: MapPlace = { id: "a", kind: "daycare", name: "Little Stars Learning Center", lat: 39.102, lon: -94.582, approximate: false, sources: ["mo-dhss-child-care-gis"], licensed: true, inclusionSignals: [] };
  const b: MapPlace = { ...a, id: "b", name: "Little Stars Learning Ctr", lat: 39.1021, lon: -94.5819, sources: ["openstreetmap"], licensed: false, website: "https://x.example" };
  assert(samePlace(a, b));
  assert(!samePlace(a, { ...b, name: "Bright Futures Preschool" }));
  const merged = mergePlaces([b, a]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].sources.sort(), ["mo-dhss-child-care-gis", "openstreetmap"]);
  assert(merged[0].licensed && merged[0].website === "https://x.example", "Licensed record survives and gains the website");

  // --- Tract collection -------------------------------------------------------
  const tracts = await collectStateTracts("MO", { fetchText: siteFixtureFetch() });
  assert.equal(tracts.tracts.length, FIXTURE_TRACTS.length);
  assert.equal(tracts.programs.find((p) => p.program === "census-acs5")?.vintage, "2019–2023", "ACS tract vintage falls back from 2024");
  assert(tracts.tracts.every((tract) => tract.metrics["acs.kids_6to11"]! + tract.metrics["acs.kids_12to17"]! === tract.metrics["acs.kids_6to17"]));
  const hotspots = tractHotspots(tracts.tracts, new Map([["29095", 80], ["29047", 20]]));
  assert.equal(hotspots.length, FIXTURE_TRACTS.length);
  assert(hotspots.every((spot) => spot.score >= 0 && spot.score <= 100));

  const keylessTracts = await collectStateTracts("MO", { fetchText: siteFixtureFetch({ keylessReporter: true }) });
  const keylessAcs = keylessTracts.programs.find((p) => p.program === "census-acs5")!;
  assert.equal(keylessAcs.status, "complete", keylessAcs.detail);
  assert(keylessAcs.detail.includes("Census Reporter"));
  assert.equal(keylessTracts.tracts.filter((t) => t.metrics["acs.kids"] !== undefined).length, FIXTURE_TRACTS.length, "Per-county fallback fills every tract");
  const geoOnly = await collectStateTracts("MO", { fetchText: async (url, signal) => /censusreporter|api\.census\.gov/.test(url) ? "<html>down</html>" : siteFixtureFetch()(url, signal) });
  assert.equal(geoOnly.tracts.length, FIXTURE_TRACTS.length, "Tract geography is kept when ACS is unavailable");
  assert(geoOnly.tracts.every((t) => t.metrics["acs.kids"] === undefined));
  assert.equal(analyzeSite(SITE_CENTER, { tracts: geoOnly.tracts, places: { center: SITE_CENTER, radiusMiles: 10, places: [], zipCounts: [], sources: [] } }).countyFips, "29095", "County still resolves without ACS");

  // --- Site places ------------------------------------------------------------
  let enriched = 0;
  const places = await collectSitePlaces("MO", SITE_CENTER, {
    fetchText: siteFixtureFetch(), postText: sitePostText,
    enrichWebsite: async (url) => { enriched++; return { url, finalUrl: url, emails: [], phones: [], fetchedAt: "", textSample: "We welcome children with special needs and support IEP goals." }; },
  });
  const byName = (name: string) => places.places.find((place) => place.name === name);
  assert(!places.places.some((place) => /private|person/i.test(place.name)), "Individual clinicians are never pinned");
  assert.equal(places.zipCounts.find((zip) => zip.zip === "64105")?.behaviorAnalysts, 3);
  assert.equal(places.zipCounts.find((zip) => zip.zip === "64108")?.pediatricClinicians, 5);
  assert(!places.zipCounts.some((zip) => zip.zip === "64155"), "ZIPs beyond 12 miles are not queried");
  const aba = byName("Heartland Aba Partners Llc")!;
  assert(aba && !aba.approximate && aba.lat === 39.099, "Geocoded organization uses the matched coordinates");
  const peds = byName("Crown Pediatrics Pc")!;
  assert(peds.approximate && peds.lat === 39.08, "Unmatched address falls back to the ZIP centroid and is flagged");
  assert(!byName("Sunrise Child Care"), "Closed licensed facilities are excluded");
  const stars = byName("Little Stars Learning Center")!;
  assert.deepEqual(stars.sources.sort(), ["mo-dhss-child-care-gis", "openstreetmap", "organization-website"]);
  assert(stars.inclusionSignals.some((signal) => signal.includes("(website)")));
  assert.equal(enriched, 1, "Only child-care websites are checked");
  assert(places.places.every((place) => place.distanceMiles! <= 10));
  assert(places.sources.every((source) => source.status === "complete"), JSON.stringify(places.sources));

  // --- Site analysis ----------------------------------------------------------
  const analysis = analyzeSite(SITE_CENTER, { tracts: tracts.tracts, places });
  assert.equal(analysis.indicators.length, 202, "202 indicators per site");
  assert.equal(new Set(analysis.indicators.map((item) => item.id)).size, 202, "Indicator ids are unique");
  const value = (id: string) => analysis.indicators.find((item) => item.id === id)?.value ?? null;
  for (const base of ["children", "children_0_5", "disability_0_4", "medicaid_children", "licensed_daycares", "licensed_capacity", "aba_organizations", "pediatric_clinicians", "expected_autistic_3_17"]) {
    assert(value(`${base}.2mi`)! <= value(`${base}.5mi`)! && value(`${base}.5mi`)! <= value(`${base}.10mi`)!, `${base} grows with radius`);
  }
  assert.equal(value("aba_organizations.10mi"), 2, "NPPES organization + ABA-named OSM facility");
  assert.equal(value("behavior_analysts.10mi"), 3);
  assert.equal(value("licensed_daycares.10mi"), 4);
  assert.equal(value("licensed_capacity.10mi"), 80 + 60 + 24 + 50);
  assert.equal(value("expected_autistic_in_childcare.10mi"), Math.round(214 * CDC_AUTISM_PREVALENCE * 100) / 100);
  assert.equal(value("nearest.aba"), Math.round(haversineMiles(SITE_CENTER, { lat: 39.099, lon: -94.579 }) * 100) / 100);
  assert.equal(value("county.county_opportunity"), null, "No county context supplied → blank, not invented");
  const computed = analysis.indicators.filter((item) => item.value !== null).length;
  assert(computed >= 190, `Most indicators computed from fixture data (${computed})`);

  const tiers = Object.fromEntries(analysis.daycares.map((item) => [item.place.name, item]));
  assert.equal(tiers["Inclusive Kids Early Learning"].tier, "priority", "Licensed + inclusion language");
  assert.equal(tiers["Little Stars Learning Center"].tier, "priority", "Website inclusion language");
  assert.equal(tiers["Little Stars Learning Center"].confirmedBy, 2);
  assert.equal(tiers["Bright Futures Preschool"].tier, "likely", "OSM-only child care is unconfirmed");
  assert.equal(tiers["Teen Center After School"].servesTargetAges, false);
  assert.equal(tiers["Northland Infant Care"].servesTargetAges, true);
  assert.equal(tiers["Inclusive Kids Early Learning"].expectedAutisticAtCapacity, Math.round(60 * CDC_AUTISM_PREVALENCE * 10) / 10);
  assert.equal(analysis.daycares[0].tier, "priority", "Priority partners sort first");
  const excludedIfNotTargetAges = assessDaycare({ ...a, inclusionSignals: ["inclusive"], minAgeYears: 6, maxAgeYears: 12 }, null);
  assert.equal(excludedIfNotTargetAges.tier, "confirmed", "Inclusion language alone is not priority if ages exclude 2–5");

  assert.equal(analysis.convergence.tests.length, 8);
  assert(analysis.convergence.tests.every((test) => test.sources.length >= 2 || test.id === "C7"), "Convergence tests cross two sources");
  assert(analysis.convergence.tests.find((test) => test.id === "C8")!.status === "fail" || analysis.convergence.tests.find((test) => test.id === "C8")!.status === "pass");
  assert.equal(analysis.convergence.tests.find((test) => test.id === "C3")!.status, "insufficient", "County supply baseline missing → insufficient, not pass");
  assert.equal(analysis.rings.length, 3);

  // --- With county context (40-join bundle for the same counties) ---------------
  const bundle = await collectStateCountyBundle("MO", { fetchText: fixtureFetch("29") });
  const withCounty = analyzeSite(SITE_CENTER, { tracts: tracts.tracts, places, counties: bundle.frames, countyReports: rankStateCounties(bundle).counties });
  const ctxValue = (id: string) => withCounty.indicators.find((item) => item.id === id)?.value ?? null;
  assert.equal(withCounty.countyFips, "29095", "Point resolves to the county of its nearest tract");
  assert(ctxValue("county.county_opportunity") !== null && ctxValue("county.county_mh_shortage") === 0);
  assert.equal(ctxValue("county.county_child_poverty"), 15);
  for (const id of ["C2", "C3", "C5"]) assert.notEqual(withCounty.convergence.tests.find((test) => test.id === id)!.status, "insufficient", `${id} evaluates with county context`);
  assert(withCounty.convergence.evaluated >= 7);
  assert.equal(withCounty.indicators.filter((item) => item.value !== null).length, 202, "All 202 indicators computed when every source responds");

  // --- Failure modes ----------------------------------------------------------
  const noNppes = await collectSitePlaces("MO", SITE_CENTER, { fetchText: siteFixtureFetch({ failNppes: true }), postText: sitePostText });
  assert.equal(noNppes.sources.find((source) => source.source.startsWith("CMS NPPES"))!.status, "unavailable");
  const noNppesAnalysis = analyzeSite(SITE_CENTER, { tracts: tracts.tracts, places: noNppes });
  assert.equal(noNppesAnalysis.indicators.find((item) => item.id === "behavior_analysts.5mi")!.value, null, "Unavailable registry → blank, not zero");
  assert.equal(noNppesAnalysis.indicators.find((item) => item.id === "aba_organizations.5mi")!.value !== null, true, "OSM still supplies ABA-named facilities");
  const empty = analyzeSite(SITE_CENTER, { tracts: [], places: { center: SITE_CENTER, radiusMiles: 10, places: [], zipCounts: [], sources: [] } });
  assert(empty.indicators.every((item) => item.value === null), "No data → every indicator blank, never zero");
  assert.equal(empty.convergence.strength, "insufficient");
  const kansas = await collectSitePlaces("KS", { lat: 39.05, lon: -94.7 }, { fetchText: siteFixtureFetch(), postText: sitePostText });
  assert.equal(kansas.sources.find((source) => /licensed child care|roster/i.test(source.source))!.status, "not_applicable");

  // --- Privacy boundary ---------------------------------------------------------
  const kinds = new Set(places.places.map((place) => place.kind));
  assert([...kinds].every((kind) => ["aba_provider", "daycare", "pediatrics", "therapy", "school", "hospital"].includes(kind)));
  const keys = new Set<string>();
  const walk = (item: unknown) => { if (Array.isArray(item)) item.forEach(walk); else if (item && typeof item === "object") for (const [k, v] of Object.entries(item)) { keys.add(k); walk(v); } };
  walk(analysis);
  assert(![...keys].some((key) => /household_?id|patient|diagnos|child_?name|parent_?name|resident/i.test(key)), "Site output is organizations and area aggregates only");

  console.log(`Site map verified: ${analysis.indicators.length} indicators (${computed} computed from fixtures), ${analysis.daycares.length} child-care facilities tiered ` +
    `(${analysis.daycares.filter((d) => d.tier === "priority").length} priority), ${places.places.length} organization pins, ` +
    `convergence ${withCounty.convergence.passed}/${withCounty.convergence.evaluated} with county context (${withCounty.convergence.strength}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
