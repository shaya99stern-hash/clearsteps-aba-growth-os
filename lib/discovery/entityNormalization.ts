export function normalizeEntityName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|corporation|pllc|pc|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeDomain(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function possibleDuplicateScore(a: { name?: string; url?: string; phone?: string }, b: { name?: string; url?: string; phone?: string }) {
  const matches: string[] = [];
  if (a.name && b.name && normalizeEntityName(a.name) === normalizeEntityName(b.name)) matches.push("organization_name");
  if (a.url && b.url && normalizeDomain(a.url) === normalizeDomain(b.url)) matches.push("website_domain");
  if (a.phone && b.phone && a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "")) matches.push("phone");
  return { score: matches.length / 3, matchingFields: matches };
}
