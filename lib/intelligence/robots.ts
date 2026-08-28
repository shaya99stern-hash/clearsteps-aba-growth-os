import { validatePublicHttpUrl } from "./network-safety";

const USER_AGENT = "ClearStepsResearch";

export async function robotsAllows(value: string): Promise<boolean> {
  const target = await validatePublicHttpUrl(value);
  if (!target) return false;

  const url = new URL(target);
  const robotsUrl = `${url.origin}/robots.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(robotsUrl, {
      headers: { "user-agent": `${USER_AGENT}/1.0` },
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return true;
    const rules = parseRobots(await response.text());
    return isAllowed(url.pathname || "/", rules);
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

type Rule = { kind: "allow" | "disallow"; path: string };

function parseRobots(text: string): Rule[] {
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

function isAllowed(pathname: string, rules: Rule[]) {
  const matching = rules
    .filter((rule) => rule.path && pathname.startsWith(rule.path.replace(/\*.*$/, "")))
    .sort((a, b) => b.path.length - a.path.length);
  if (!matching.length) return true;
  return matching[0].kind === "allow";
}
