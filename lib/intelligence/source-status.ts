import { playwrightAvailable } from "./browser-collector";
import { getNppesDownloadManifest } from "./official/nppes-manifest";
import { getSourceRegistry } from "./source-registry";
import type { SourceDescriptor, SourceHealth } from "./source-types";

export interface OperationalSourceStatus extends SourceDescriptor {
  runtimeHealth: SourceHealth;
  detail: string;
  checkedAt: string;
}

export interface OperationalSourcesSnapshot {
  checkedAt: string;
  counts: {
    ready: number;
    degraded: number;
    unavailable: number;
    apiKeyFree: number;
  };
  sources: OperationalSourceStatus[];
  cms: {
    fetchedAt?: string;
    monthly?: { label: string; url: string };
    weeklyCount: number;
    deactivation?: { label: string; url: string };
    error?: string;
  };
}

export async function getOperationalSourcesSnapshot(): Promise<OperationalSourcesSnapshot> {
  const checkedAt = new Date().toISOString();
  const [browserResult, cmsResult] = await Promise.allSettled([
    playwrightAvailable(),
    getNppesDownloadManifest(),
  ]);

  const browserReady = browserResult.status === "fulfilled" && browserResult.value;
  const cmsManifest = cmsResult.status === "fulfilled" ? cmsResult.value : undefined;
  const cmsError = cmsResult.status === "rejected"
    ? cmsResult.reason instanceof Error ? cmsResult.reason.message : "CMS manifest check failed"
    : undefined;

  const sources = getSourceRegistry().map((source): OperationalSourceStatus => {
    if (source.id === "playwright-public-browser") {
      return {
        ...source,
        runtimeHealth: browserReady ? "ready" : "degraded",
        detail: browserReady
          ? "Playwright package is available to the Node runtime. Browser launch still depends on a compatible installed browser binary."
          : "Optional Playwright runtime is not installed; fetch/download collectors remain active.",
        checkedAt,
      };
    }
    if (source.id === "cms-nppes") {
      return {
        ...source,
        runtimeHealth: cmsManifest ? "ready" : "degraded",
        detail: cmsManifest
          ? `CMS manifest reachable: ${cmsManifest.weekly.length} weekly update file(s) plus current baseline metadata.`
          : `CMS adapter is configured, but the live manifest check failed: ${cmsError ?? "unknown error"}.`,
        checkedAt,
      };
    }
    if (source.id === "nj-childcare-download") {
      return {
        ...source,
        runtimeHealth: "ready",
        detail: "Direct official CSV adapter is active; Scout fetches on demand and caches parsed rows for 30 minutes.",
        checkedAt,
      };
    }
    if (source.id === "duckduckgo-html") {
      return {
        ...source,
        runtimeHealth: "ready",
        detail: "API-key-free discovery adapter is enabled with bounded concurrency and evidence-only treatment of snippets.",
        checkedAt,
      };
    }
    if (source.id === "public-website") {
      return {
        ...source,
        runtimeHealth: "ready",
        detail: "Direct public-site enrichment is enabled with SSRF checks, redirect revalidation, robots policy, and bounded extraction.",
        checkedAt,
      };
    }
    if (source.id === "public-community") {
      return {
        ...source,
        runtimeHealth: "ready",
        detail: "Public/indexable community evidence is enabled as territory intelligence only; individual parent/child identities are not CRM targets.",
        checkedAt,
      };
    }
    return { ...source, runtimeHealth: source.health, detail: source.usageNote, checkedAt };
  });

  return {
    checkedAt,
    counts: {
      ready: sources.filter((source) => source.runtimeHealth === "ready").length,
      degraded: sources.filter((source) => source.runtimeHealth === "degraded").length,
      unavailable: sources.filter((source) => source.runtimeHealth === "unavailable").length,
      apiKeyFree: sources.filter((source) => !source.apiKeyRequired).length,
    },
    sources,
    cms: {
      fetchedAt: cmsManifest?.fetchedAt,
      monthly: cmsManifest?.monthly ? { label: cmsManifest.monthly.label, url: cmsManifest.monthly.url } : undefined,
      weeklyCount: cmsManifest?.weekly.length ?? 0,
      deactivation: cmsManifest?.deactivation ? { label: cmsManifest.deactivation.label, url: cmsManifest.deactivation.url } : undefined,
      error: cmsError,
    },
  };
}
