export interface LatLon { lat: number; lon: number }

export const SITE_RADII_MILES = [2, 5, 10] as const;
export type SiteRadius = (typeof SITE_RADII_MILES)[number];
export const MAX_SITE_RADIUS = 10;

export function haversineMiles(a: LatLon, b: LatLon): number {
  const r = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box (WGS84) that fully contains a circle of `miles` around the point. */
export function boundsAround(center: LatLon, miles: number) {
  const dLat = miles / 69.0;
  const dLon = miles / (69.172 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return { west: center.lon - dLon, south: center.lat - dLat, east: center.lon + dLon, north: center.lat + dLat };
}

export function isValidPoint(point: Partial<LatLon> | null | undefined): point is LatLon {
  return Boolean(point) && Number.isFinite(point!.lat) && Number.isFinite(point!.lon) &&
    Math.abs(point!.lat!) <= 90 && Math.abs(point!.lon!) <= 180 && !(point!.lat === 0 && point!.lon === 0);
}

/** GeoJSON polygon approximating a circle, for drawing radius rings. */
export function circlePolygon(center: LatLon, miles: number, steps = 72): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (miles / 69.0) * Math.sin(angle);
    const dLon = (miles / (69.172 * Math.cos((center.lat * Math.PI) / 180))) * Math.cos(angle);
    coords.push([center.lon + dLon, center.lat + dLat]);
  }
  return coords;
}

/** Generous state bounding boxes (WGS84) used to reject points outside the research states. */
export const STATE_BOUNDS = {
  MO: { west: -95.9, south: 35.9, east: -89.0, north: 40.7, center: { lat: 38.45, lon: -92.45 }, zoom: 6.1 },
  KS: { west: -102.2, south: 36.9, east: -94.5, north: 40.1, center: { lat: 38.5, lon: -98.35 }, zoom: 6.0 },
  CO: { west: -109.2, south: 36.9, east: -101.9, north: 41.1, center: { lat: 39.0, lon: -105.55 }, zoom: 6.0 },
} as const;

export function insideState(state: keyof typeof STATE_BOUNDS, point: LatLon) {
  const box = STATE_BOUNDS[state];
  return point.lat >= box.south && point.lat <= box.north && point.lon >= box.west && point.lon <= box.east;
}
