import { isRecord } from "../joins/util";
import { isValidPoint } from "./geo-math";

/**
 * OpenStreetMap facility classification shared by map pins and statewide county counts.
 * Facility tags only; anything mapped as a dwelling is never used.
 */
export type PlaceKind = "aba_provider" | "daycare" | "pediatrics" | "therapy" | "school" | "hospital";

export interface MapPlace {
  id: string;
  kind: PlaceKind;
  name: string;
  lat: number;
  lon: number;
  /** Placed at a ZIP centroid because the address could not be geocoded. */
  approximate: boolean;
  address?: string;
  city?: string;
  zip?: string;
  phone?: string;
  website?: string;
  sources: string[];
  licensed?: boolean;
  capacity?: number;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  schoolDistrictOperated?: boolean;
  inclusionSignals: string[];
  distanceMiles?: number;
}

export const INCLUSION_PATTERN = /\b(inclusi(?:ve|on)|special needs|special education|early intervention|developmental(?:ly)?|autism|autistic|therapeutic|IEP|IFSP|ECSE|early childhood special|sensory|speech therapy|occupational therapy|behavior(?:al)? support|ABA)\b/gi;
const ABA_NAME = /\b(aba|autism|autistic|applied behavior|behavior(?:al)? (?:analysis|therapy|analyst))\b/i;

export function inclusionSignals(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(INCLUSION_PATTERN)) found.add(match[0].toLowerCase());
  return [...found].slice(0, 6);
}

export function parseOverpassPlaces(payload: unknown): MapPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) throw new Error("Overpass returned no elements");
  const out: MapPlace[] = [];
  for (const element of payload.elements) {
    if (!isRecord(element) || !isRecord(element.tags)) continue;
    const tags = element.tags as Record<string, string>;
    const name = tags.name?.trim();
    if (!name) continue;
    // Facility tags only; anything mapped as a dwelling is never used.
    if (/^(house|residential|apartments|detached|semidetached_house)$/.test(tags.building ?? "")) continue;
    const center = isRecord(element.center) ? element.center : element;
    const lat = Number(center.lat);
    const lon = Number(center.lon);
    if (!isValidPoint({ lat, lon })) continue;
    const amenity = tags.amenity ?? "";
    const healthcare = tags.healthcare ?? "";
    const speciality = (tags["healthcare:speciality"] ?? "") + " " + (tags.description ?? "");
    let kind: PlaceKind | null = null;
    if (ABA_NAME.test(name) || /autism|behavio/i.test(speciality)) kind = "aba_provider";
    else if (amenity === "childcare" || amenity === "kindergarten") kind = "daycare";
    else if (/paediatric|pediatric/i.test(speciality) || /pediatric|paediatric|children'?s clinic/i.test(name)) kind = "pediatrics";
    else if (/speech_therapist|occupational_therapist|physiotherapist/.test(healthcare)) kind = "therapy";
    else if (amenity === "school") kind = "school";
    else if (amenity === "hospital") kind = "hospital";
    if (!kind) continue;
    out.push({
      id: `osm-${element.type}-${element.id}`, kind, name, lat, lon, approximate: false,
      address: [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined,
      city: tags["addr:city"], zip: tags["addr:postcode"]?.slice(0, 5), phone: tags.phone ?? tags["contact:phone"],
      website: tags.website ?? tags["contact:website"], sources: ["openstreetmap"], licensed: false,
      capacity: Number(tags.capacity) > 0 ? Number(tags.capacity) : undefined,
      minAgeYears: tags.min_age ? Number(tags.min_age) : null, maxAgeYears: tags.max_age ? Number(tags.max_age) : null,
      inclusionSignals: kind === "daycare" ? inclusionSignals(name + " " + (tags.description ?? "")) : [],
    });
  }
  return out;
}

