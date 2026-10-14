import { validatePublicHttpUrl } from "./network-safety";
import { CoalescingCache } from "./runtime";

const USER_AGENT = "ClearStepsResearch";

type Rule = { kind: "allow" | "disallow"; path: string };

// One robots.txt fetch per origin per hour instead of one per enriched page.
const robotsCache = new CoalescingCache<Rule[]>(500, 60 * 60_000);

export async function robotsAllows(value: string): Promise<boolean> {
  const target = await validatePublicHttpUrl(value);
  if (!target) return false;

  const url = new URL(target);
  const rules = await robotsCache.get(url.origin, () => fetchRules(url.origin));
  return isAllowed(url.pathname + url.search, rules);
}

async function fetchRules(origin: string): Promise<Rule[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": `${USER_AGENT}/1.0` },
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return parseRobots(await response.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function parseRobots(text: string): Rule[] {
  const groups: Array<{ agents: string[]; rules: Rule[] }> = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current || (key !== "allow" && key !== "disallow")) continue;
    if (!value && key === "disallow") continue;
    current.rules.push({ kind: key, path: value });
  }

  const exact = groups.find((group) => group.agents.some((agent) => USER_AGENT.toLowerCase().includes(agent) && agent !== "*"));
  const wildcard = groups.find((group) => group.agents.includes("*"));
  return (exact ?? wildcard)?.rules ?? [];
}

/** RFC 9309: the longest matching path wins, `*` matches any run, `$` anchors, Allow wins ties. */
export function isAllowed(path: string, rules: readonly Rule[]) {
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!rule.path || !robotsPatternMatches(rule.path, path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.kind === "allow")) best = rule;
  }
  return !best || best.kind === "allow";
}

function robotsPatternMatches(pattern: string, path: string) {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp("^" + source + (anchored ? "$" : "")).test(path);
}
