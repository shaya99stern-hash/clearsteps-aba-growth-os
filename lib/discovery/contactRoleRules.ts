import { recommendedContactRoles } from "@/lib/intelligence/recommendations";
import type { Classification } from "@/lib/domain/types";

export function getTargetContactRoles(sourceType: string, classification: Classification) {
  return recommendedContactRoles(sourceType, classification);
}
