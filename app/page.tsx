import Link from "next/link";
import { PageShell, MetricCard, InfoCard, EmptyState } from "@/components/PageShell";
import { getSearchConnectorStatus } from "@/lib/connectors/searchProviders/searchProviderRegistry";

const dashboardCards = [
  ["Total referral opportunities", "0"],
  ["High-priority opportunities", "0"],
  ["Ready for outreach", "0"],
  ["Needs enrichment", "0"],
  ["Demand signals", "0"],
  ["Competitor / market signals", "0"],
  ["Missing contact", "0"],
  ["Missing phone/email", "0"],
  ["Follow-ups due", "0"],
];

const quickLinks = [
  ["Lead Discovery", "/lead-discovery"],
  ["Connectors", "/connectors"],
  ["Research Runs", "/research-runs"],
  ["Outreach", "/outreach"],
  ["Settings", "/settings"],
];

export default function HomePage() {
  const searchConnector = getSearchConnectorStatus();
  const providerConfigured = searchConnector.status === "configured";

  return (
    <PageShell
      title="Clear Steps ABA Growth OS"
      description="Private organization-level referral growth operating system for discovery, intelligence, outreach preparation, and follow-up workflow."
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Dashboard</p>
                <h2 className="mt-2 text-2xl font-bold">Pipeline starts at zero until real/imported/discovered data exists</h2>
              </div>
              <p className="text-sm text-slate-500">No seeded records.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboardCards.map(([title, value]) => <MetricCard key={title} title={title} value={value} />)}
            </div>
          </section>

          <EmptyState
            title="Recommended next actions"
            description="Start with provider setup, then run one focused discovery scan. No bulk outreach until compliance settings and review are configured."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {quickLinks.map(([label, href]) => (
                <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 hover:border-cyan-400 hover:bg-cyan-50">
                  {label}
                </Link>
              ))}
            </div>
          </EmptyState>
        </div>

        <aside className="space-y-6">
          <InfoCard title="Connector status" description="Live discovery uses server-side provider checks. API keys are never exposed to the browser.">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold">SerpAPI Public Web Search</p>
              <p className="mt-1 text-sm text-slate-600">Status: <span className="font-semibold">{providerConfigured ? "configured" : "needs API key"}</span></p>
              <p className="mt-1 text-xs text-slate-500">Required env var: SERPAPI_API_KEY</p>
            </div>
          </InfoCard>

          <InfoCard title="Compliance guardrails">
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Organization-level referral intelligence only.</li>
              <li>• Do not collect child names, diagnoses, or private health data.</li>
              <li>• Do not scrape private parent groups.</li>
              <li>• Manual review required before outreach.</li>
            </ul>
          </InfoCard>
        </aside>
      </div>
    </PageShell>
  );
}
