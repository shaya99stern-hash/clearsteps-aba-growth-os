"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { Crosshair, Layers, LoaderCircle, Phone, ShieldAlert } from "lucide-react";
import { circlePolygon } from "@/lib/intelligence/geo/geo-math";
import styles from "./TerritoryMap.module.css";

type MapState = "MO" | "KS" | "CO";
type StateLayers = {
  ok: true; state: MapState; view: { center: { lat: number; lon: number }; zoom: number };
  counties: Array<{ fips: string; name: string; lat: number; lon: number; score: number | null; rank: number | null; rankedOf: number; confidence: number; children: number | null; driver: string | null }>;
  hotspots: Array<{ g: string; la: number; lo: number; k: number; s: number; sm: boolean }>;
  sources: Array<{ source: string; status: string; detail: string }>;
};
type Place = { id: string; kind: string; name: string; lat: number; lon: number; approximate: boolean; address: string | null; city: string | null; phone: string | null; website: string | null; sources: string[]; licensed: boolean; capacity: number | null; distanceMiles: number | null };
type Daycare = { id: string; name: string; tier: "priority" | "confirmed" | "likely"; distanceMiles: number | null; capacity: number | null; phone: string | null; address: string | null; city: string | null; website: string | null; ages: string | null; confirmedBy: number; servesTargetAges: boolean | null; reasons: string[]; expectedAutisticAtCapacity: number | null; expectedWithDisabilityAtCapacity: number | null };
type Indicator = { id: string; family: string; name: string; radiusMiles: number | null; value: number | null; unit: string; sources: string[]; basis: string };
type SiteResponse = {
  ok: true; state: MapState; center: { lat: number; lon: number }; countyFips: string | null;
  familyTitles: Record<string, string>; prevalenceSource: string;
  rings: Array<{ radiusMiles: number; children: number | null; childrenUnder6: number | null; withDisability: number | null; abaProviders: number; licensedDaycares: number; licensedCapacity: number; pediatricSources: number }>;
  indicators: Indicator[];
  daycares: Daycare[];
  places: Place[];
  convergence: { tests: Array<{ id: string; title: string; status: "pass" | "fail" | "insufficient"; sources: string[]; detail: string }>; passed: number; evaluated: number; strength: string };
  notes: string[];
  sources: Array<{ source: string; status: string; detail: string }>;
};

const STATE_NAMES: Record<MapState, string> = { MO: "Missouri", KS: "Kansas", CO: "Colorado" };
const STYLE_URLS = ["https://tiles.openfreemap.org/styles/dark", "https://tiles.openfreemap.org/styles/positron"];
/** Last-resort basemap: overlays (pins, rings, hotspots) still work if the tile host is unreachable. */
const BLANK_STYLE = {
  version: 8 as const,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#1a1a1d" } }],
};
const RADII = [2, 5, 10] as const;

/** Pin colors by place kind / child-care tier. */
export const PIN_COLORS = {
  aba_provider: "#ff6b6b",
  priority: "#ffd166",
  confirmed: "#5aa9ff",
  likely: "#8fa3b8",
  pediatrics: "#c792ea",
  therapy: "#2dd4bf",
  school: "#7bd88f",
  hospital: "#f2f2f2",
} as const;
const LEGEND: Array<[keyof typeof PIN_COLORS, string]> = [
  ["aba_provider", "ABA providers (competitors)"],
  ["priority", "Child care: priority partner"],
  ["confirmed", "Child care: licensed (has children)"],
  ["likely", "Child care: listed, unconfirmed"],
  ["pediatrics", "Pediatric practices"],
  ["therapy", "Speech / OT / PT"],
  ["school", "Schools"],
  ["hospital", "Hospitals"],
];

function fmt(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "—";
  return Math.abs(value) >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(digits && Math.abs(value) < 100 ? digits : 0);
}

export function TerritoryMap({ initialState = "MO" }: { initialState?: MapState }) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [state, setState] = useState<MapState>(initialState);
  const [layers, setLayers] = useState<StateLayers | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [site, setSite] = useState<SiteResponse | null>(null);
  const [loadingSite, setLoadingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({ counties: true, hotspots: true, ...Object.fromEntries(Object.keys(PIN_COLORS).map((key) => [key, true])) });
  const [tierFilter, setTierFilter] = useState<"all" | "priority" | "confirmed" | "likely">("all");
  const [family, setFamily] = useState<string>("all");
  const [query, setQuery] = useState("");
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  async function loadState(target: MapState) {
    setLoadingState(true);
    setError(null);
    setSite(null);
    try {
      const response = await fetch("/api/intelligence/map/state?state=" + target, { cache: "no-store" });
      const payload = await response.json() as StateLayers | { ok: false; error: string };
      if (!payload.ok) throw new Error(payload.error);
      setLayers(payload);
      mapRef.current?.flyTo({ center: [payload.view.center.lon, payload.view.center.lat], zoom: payload.view.zoom });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "State layers failed");
    } finally {
      setLoadingState(false);
    }
  }

  async function analyze(target: MapState, lat: number, lon: number) {
    setLoadingSite(true);
    setError(null);
    try {
      const response = await fetch(`/api/intelligence/map/site?state=${target}&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`, { cache: "no-store" });
      const payload = await response.json() as SiteResponse | { ok: false; error: string };
      if (!payload.ok) throw new Error(payload.error);
      setSite(payload);
      mapRef.current?.flyTo({ center: [lon, lat], zoom: Math.max(mapRef.current.getZoom(), 10.2) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Site analysis failed");
    } finally {
      setLoadingSite(false);
    }
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    const coords = text.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (coords) { await analyze(state, Number(coords[1]), Number(coords[2])); return; }
    setError(null);
    try {
      const response = await fetch(`/api/intelligence/map/geocode?state=${state}&q=${encodeURIComponent(text)}`, { cache: "no-store" });
      const payload = await response.json() as { ok: true; lat: number; lon: number } | { ok: false; error: string };
      if (!payload.ok) throw new Error(payload.error);
      await analyze(state, payload.lat, payload.lon);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Address lookup failed");
    }
  }

  // Map bootstrap (client only).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibre.setWorkerUrl(new URL("/vendor/maplibre/maplibre-gl-worker.mjs", window.location.origin).href);
      let styleIndex = 0;
      map = new maplibre.Map({
        container: container.current,
        style: STYLE_URLS[0],
        center: [-92.45, 38.45],
        zoom: 6,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      let loaded = false;
      map.on("error", () => {
        if (loaded || !map) return;
        styleIndex++;
        if (styleIndex < STYLE_URLS.length) map.setStyle(STYLE_URLS[styleIndex]);
        else if (styleIndex === STYLE_URLS.length) {
          map.setStyle(BLANK_STYLE);
          setMapError("Basemap tiles unavailable; data layers still work.");
        }
      });
      map.on("load", () => {
        if (!map || cancelled) return;
        loaded = true;
        const empty = { type: "FeatureCollection" as const, features: [] };
        for (const id of ["counties", "hotspots", "places", "rings", "site"]) map.addSource(id, { type: "geojson", data: empty });
        map.addLayer({ id: "hotspots", type: "circle", source: "hotspots", paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 9, 7, 12, 16],
          "circle-color": ["interpolate", ["linear"], ["get", "s"], 30, "#2b2f45", 55, "#8a4f7d", 75, "#e0785a", 90, "#ffd166"],
          "circle-opacity": ["interpolate", ["linear"], ["get", "s"], 30, 0.25, 90, 0.75],
          "circle-blur": 0.4,
        } });
        map.addLayer({ id: "rings", type: "line", source: "rings", paint: { "line-color": "#f0b18f", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.9 } });
        map.addLayer({ id: "ring-labels", type: "symbol", source: "rings", layout: { "text-field": ["concat", ["get", "r"], " mi"], "text-size": 11, "symbol-placement": "line", "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#f0b18f", "text-halo-color": "#111", "text-halo-width": 1 } });
        map.addLayer({ id: "counties", type: "circle", source: "counties", paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 7, 8, 14],
          "circle-color": ["case", ["==", ["get", "score"], -1], "#55525a", ["interpolate", ["linear"], ["get", "score"], 30, "#3d4a6b", 50, "#8a6fb0", 65, "#e0785a", 80, "#ffd166"]],
          "circle-stroke-color": "#111", "circle-stroke-width": 1, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.9, 10, 0.15],
        } });
        map.addLayer({ id: "county-labels", type: "symbol", source: "counties", minzoom: 6.5, maxzoom: 10, layout: { "text-field": ["get", "label"], "text-size": 10, "text-offset": [0, 1.6], "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#d8d2ca", "text-halo-color": "#111", "text-halo-width": 1 } });
        map.addLayer({ id: "places", type: "circle", source: "places", paint: {
          "circle-radius": ["case", ["==", ["get", "group"], "priority"], 7, ["==", ["get", "group"], "aba_provider"], 6.5, 5],
          "circle-color": ["get", "color"],
          "circle-stroke-color": ["case", ["get", "approximate"], "#ffffff", "#111111"],
          "circle-stroke-width": ["case", ["get", "approximate"], 1.5, 1],
          "circle-opacity": ["case", ["==", ["get", "group"], "likely"], 0.55, 0.95],
        } });
        map.addLayer({ id: "site", type: "circle", source: "site", paint: { "circle-radius": 8, "circle-color": "#ffffff", "circle-stroke-color": "#e0785a", "circle-stroke-width": 3 } });

        const popup = new maplibre.Popup({ closeButton: true, maxWidth: "280px" });
        const showPopup = (event: MapLayerMouseEvent, html: string) => popup.setLngLat(event.lngLat).setHTML(html).addTo(map!);
        const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
        map.on("click", "places", (event) => {
          const p = event.features?.[0]?.properties as Record<string, string | number | boolean> | undefined;
          if (!p) return;
          showPopup(event, `<b>${esc(p.name)}</b><br><span>${esc(p.label)}</span><br>${p.address ? esc(p.address) + "<br>" : ""}${p.phone ? esc(p.phone) + "<br>" : ""}${p.capacity ? "Licensed capacity " + esc(p.capacity) + "<br>" : ""}<small>${esc(p.sources)}${p.approximate ? " · placed at ZIP centroid" : ""}</small>`);
        });
        map.on("click", "counties", (event) => {
          const p = event.features?.[0]?.properties as Record<string, string | number> | undefined;
          if (!p) return;
          showPopup(event, `<b>${esc(p.name)}</b><br>Score ${esc(Number(p.score) < 0 ? "—" : p.score)}/100 · rank ${esc(p.rank || "—")} of ${esc(p.rankedOf)}<br><small>${esc(p.driver || "")}</small>`);
        });
        for (const layer of ["places", "counties"]) {
          map.on("mouseenter", layer, () => { map!.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map!.getCanvas().style.cursor = ""; });
        }
        map.on("click", (event) => {
          const hit = map!.queryRenderedFeatures(event.point, { layers: ["places", "counties"] });
          if (hit.length) return;
          void analyze(stateRef.current, event.lngLat.lat, event.lngLat.lng);
        });
        mapRef.current = map;
        setMapReady(true);
      });
    })().catch((caught) => setMapError(caught instanceof Error ? caught.message : "Map failed to start"));
    return () => { cancelled = true; map?.remove(); mapRef.current = null; };
  }, []);

  // Sync data into map sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const set = (id: string, features: GeoJSON.Feature[]) => (map.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    set("counties", visible.counties ? (layers?.counties ?? []).map((county) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [county.lon, county.lat] },
      properties: { ...county, score: county.score ?? -1, label: county.rank ? `#${county.rank} ${county.name}` : county.name },
    })) : []);
    set("hotspots", visible.hotspots ? (layers?.hotspots ?? []).map((spot) => ({ type: "Feature", geometry: { type: "Point", coordinates: [spot.lo, spot.la] }, properties: { s: spot.s, k: spot.k } })) : []);
    const tierById = new Map((site?.daycares ?? []).map((item) => [item.id, item.tier]));
    set("places", (site?.places ?? []).flatMap((place) => {
      const group = place.kind === "daycare" ? tierById.get(place.id) ?? "likely" : place.kind;
      if (!visible[group]) return [];
      const label = LEGEND.find(([key]) => key === group)?.[1] ?? group;
      return [{ type: "Feature", geometry: { type: "Point", coordinates: [place.lon, place.lat] }, properties: {
        name: place.name, group, label, color: PIN_COLORS[group as keyof typeof PIN_COLORS] ?? "#999", approximate: place.approximate,
        address: [place.address, place.city].filter(Boolean).join(", "), phone: place.phone ?? "", capacity: place.capacity ?? "", sources: place.sources.join(", "),
      } }];
    }));
    set("site", site ? [{ type: "Feature", geometry: { type: "Point", coordinates: [site.center.lon, site.center.lat] }, properties: {} }] : []);
    set("rings", site ? RADII.map((r) => ({ type: "Feature", geometry: { type: "LineString", coordinates: circlePolygon(site.center, r) }, properties: { r } })) : []);
  }, [layers, site, visible, mapReady]);

  const indicatorRows = useMemo(() => {
    const rows = new Map<string, { family: string; name: string; unit: string; basis: string; sources: string[]; values: Record<string, number | null> }>();
    for (const item of site?.indicators ?? []) {
      const base = item.radiusMiles === null ? item.id : item.id.replace(/\.\d+mi$/, "");
      const row = rows.get(base) ?? { family: item.family, name: item.name, unit: item.unit, basis: item.basis, sources: item.sources, values: {} };
      row.values[item.radiusMiles === null ? "point" : String(item.radiusMiles)] = item.value;
      rows.set(base, row);
    }
    return [...rows.entries()];
  }, [site]);
  const families = useMemo(() => [...new Set(indicatorRows.map(([, row]) => row.family))], [indicatorRows]);
  const daycares = (site?.daycares ?? []).filter((item) => tierFilter === "all" || item.tier === tierFilter);
  const tierCounts = { priority: 0, confirmed: 0, likely: 0 };
  for (const item of site?.daycares ?? []) tierCounts[item.tier]++;
  const computed = (site?.indicators ?? []).filter((item) => item.value !== null).length;

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <label className={styles.select}><span>State</span>
          <select value={state} onChange={(event) => setState(event.target.value as MapState)}>
            <option value="MO">Missouri</option><option value="KS">Kansas</option><option value="CO">Colorado</option>
          </select>
        </label>
        <button type="button" className={styles.primary} onClick={() => loadState(state)} disabled={loadingState || !mapReady}>
          {loadingState ? <LoaderCircle size={15} className={styles.spin} /> : <Layers size={15} />}
          {loadingState ? "Loading public data…" : `Load ${STATE_NAMES[state]} county scores + hotspots`}
        </button>
        <form className={styles.search} onSubmit={search} role="search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Clinic address, or lat,lon" aria-label="Analyze an address or coordinates" />
          <button type="submit" disabled={!query.trim() || loadingSite}>Analyze</button>
        </form>
        <span className={styles.hint}><Crosshair size={14} /> Or click anywhere on the map.</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapWrap}>
          <div ref={container} className={styles.map} role="application" aria-label={`Map of ${STATE_NAMES[state]}`} />
          {(loadingSite || mapError) && (
            <div className={styles.mapOverlay}>{mapError ? <><ShieldAlert size={14} /> {mapError}</> : <><LoaderCircle size={14} className={styles.spin} /> Analyzing 10-mile area…</>}</div>
          )}
          <details className={styles.legend}>
            <summary>Layers</summary>
            <label><input type="checkbox" checked={visible.counties} onChange={() => setVisible({ ...visible, counties: !visible.counties })} /> <i className={styles.countySwatch} /> County score</label>
            <label><input type="checkbox" checked={visible.hotspots} onChange={() => setVisible({ ...visible, hotspots: !visible.hotspots })} /> <i className={styles.heatSwatch} /> Tract hotspots</label>
            {LEGEND.map(([key, label]) => (
              <label key={key}><input type="checkbox" checked={visible[key]} onChange={() => setVisible({ ...visible, [key]: !visible[key] })} /> <i style={{ background: PIN_COLORS[key] }} /> {label}</label>
            ))}
            <small>White outline = placed at ZIP centroid (approximate)</small>
          </details>
        </div>

        <aside className={styles.panel} aria-live="polite">
          {error && <p className={styles.error} role="alert"><ShieldAlert size={14} /> {error}</p>}
          {!site && (
            <div className={styles.empty}>
              <h3>Narrow down to a 2-mile area</h3>
              <p>1. Load a state to see county scores (90 data joins) and census-tract hotspots, where young children, developmental need and insured families concentrate.</p>
              <p>2. Click a hotspot or any address area. Clear Steps pulls licensed child care, ABA providers, pediatric practices, schools and hospitals within 10 miles, and scores 202 indicators at 2, 5 and 10 miles.</p>
              {layers && <p className={styles.muted}>{layers.counties.length} counties · {layers.hotspots.length.toLocaleString("en-US")} tract hotspots · {layers.sources.filter((s) => s.status === "complete").length}/{layers.sources.length} sources responding</p>}
            </div>
          )}
          {site && (
            <>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div><span className={styles.kicker}>Selected point · {site.center.lat.toFixed(4)}, {site.center.lon.toFixed(4)}</span>
                    <h3>Cross-source strength: <em className={styles[site.convergence.strength] ?? ""}>{site.convergence.strength}</em></h3></div>
                  <b className={styles.big}>{site.convergence.passed}/{site.convergence.evaluated}</b>
                </div>
                <table className={styles.rings}>
                  <thead><tr><th /><th>2 mi</th><th>5 mi</th><th>10 mi</th></tr></thead>
                  <tbody>
                    {([
                      ["Children under 18", (r: SiteResponse["rings"][number]) => fmt(r.children)],
                      ["Children 0–5", (r: SiteResponse["rings"][number]) => fmt(r.childrenUnder6)],
                      ["With a disability", (r: SiteResponse["rings"][number]) => fmt(r.withDisability)],
                      ["Licensed child care", (r: SiteResponse["rings"][number]) => fmt(r.licensedDaycares)],
                      ["Licensed slots", (r: SiteResponse["rings"][number]) => fmt(r.licensedCapacity)],
                      ["ABA providers", (r: SiteResponse["rings"][number]) => fmt(r.abaProviders)],
                      ["Pediatric practices", (r: SiteResponse["rings"][number]) => fmt(r.pediatricSources)],
                    ] as const).map(([label, fn]) => (
                      <tr key={label}><th>{label}</th>{site.rings.map((ring) => <td key={ring.radiusMiles}>{fn(ring)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={styles.card}>
                <span className={styles.kicker}>8 convergence tests · each needs two independent sources</span>
                <ul className={styles.tests}>
                  {site.convergence.tests.map((test) => (
                    <li key={test.id} className={styles[test.status]}>
                      <b>{test.status === "pass" ? "✓" : test.status === "fail" ? "✗" : "?"} {test.title}</b>
                      <small>{test.detail}</small>
                      <small className={styles.muted}>{test.sources.join(" × ")}</small>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.kicker}>Child care within 10 mi · {site.daycares.length}</span>
                  <div className={styles.chips}>
                    {(["all", "priority", "confirmed", "likely"] as const).map((tier) => (
                      <button key={tier} type="button" className={tierFilter === tier ? styles.chipOn : styles.chip} onClick={() => setTierFilter(tier)}>
                        {tier === "all" ? "All" : tier === "priority" ? `Priority ${tierCounts.priority}` : tier === "confirmed" ? `Licensed ${tierCounts.confirmed}` : `Unconfirmed ${tierCounts.likely}`}
                      </button>
                    ))}
                  </div>
                </div>
                <p className={styles.muted}>Licensed facilities definitely care for children. Expected counts apply CDC&apos;s 1-in-31 autism prevalence to licensed capacity: a statistical expectation for planning referral outreach, not identified children.</p>
                <ol className={styles.daycares}>
                  {daycares.slice(0, 60).map((item) => (
                    <li key={item.id}>
                      <div className={styles.dcHead}>
                        <i style={{ background: PIN_COLORS[item.tier] }} />
                        <b>{item.name}</b>
                        <span>{fmt(item.distanceMiles, 1)} mi</span>
                      </div>
                      <small>
                        {item.tier === "priority" ? "Priority partner" : item.tier === "confirmed" ? "Licensed" : "Unconfirmed listing"}
                        {item.capacity ? ` · ${item.capacity} slots` : ""}{item.ages ? ` · ages ${item.ages}` : ""}
                        {item.expectedAutisticAtCapacity !== null ? ` · ≈${item.expectedAutisticAtCapacity} expected autistic at capacity` : ""}
                        {item.expectedWithDisabilityAtCapacity !== null ? ` · ≈${item.expectedWithDisabilityAtCapacity} with a disability (local rate)` : ""}
                      </small>
                      <small className={styles.muted}>{item.reasons.slice(1).join(" · ")}</small>
                      <span className={styles.contact}>
                        {item.phone && <a href={"tel:" + item.phone.replace(/[^\d+]/g, "")}><Phone size={11} /> {item.phone}</a>}
                        {item.address && <span>{item.address}{item.city ? ", " + item.city : ""}</span>}
                        {item.website && <a href={item.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.kicker}>{computed}/{site.indicators.length} indicators computed</span>
                  <select value={family} onChange={(event) => setFamily(event.target.value)} aria-label="Indicator family">
                    <option value="all">All families</option>
                    {families.map((item) => <option key={item} value={item}>{site.familyTitles[item] ?? item}</option>)}
                  </select>
                </div>
                <table className={styles.indicators}>
                  <thead><tr><th>Indicator</th><th>2 mi</th><th>5 mi</th><th>10 mi</th></tr></thead>
                  <tbody>
                    {indicatorRows.filter(([, row]) => family === "all" || row.family === family).map(([id, row]) => (
                      <tr key={id} title={row.basis + " · " + row.sources.join(", ")}>
                        <th>{row.name}<small>{row.unit}</small></th>
                        {"point" in row.values
                          ? <td colSpan={3}>{fmt(row.values.point, 2)}</td>
                          : RADII.map((r) => <td key={r}>{fmt(row.values[String(r)], 2)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={styles.card}>
                <span className={styles.kicker}>Sources for this point</span>
                <ul className={styles.sources}>
                  {site.sources.map((source) => <li key={source.source}><i className={source.status === "complete" ? styles.dotOk : source.status === "not_applicable" ? styles.dotNa : styles.dotBad} /> <b>{source.source}</b> <small>{source.detail}</small></li>)}
                </ul>
                {site.notes.map((note) => <p key={note} className={styles.muted}>{note}</p>)}
              </section>
            </>
          )}
          <p className={styles.boundary}>Only organizations and area statistics appear on this map. Individual clinicians are counted, never pinned, and no child, family or household is located or inferred.</p>
        </aside>
      </div>
    </div>
  );
}
