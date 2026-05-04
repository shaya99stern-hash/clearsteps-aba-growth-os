import { DiscoveryConsole } from "@/components/DiscoveryConsole";
import { getSearchConnectorStatus } from "@/lib/connectors/searchProviders/searchProviderRegistry";
import { queryFamilies } from "@/lib/discovery/queryFamilies";
import { importTemplates } from "@/lib/import/templates";

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

const sections = [
  "Dashboard",
  "Lead Discovery",
  "Research Runs",
  "Referral Sources",
  "Organizations",
  "Contacts",
  "Demand Signals",
  "Competitor Signals",
  "Intelligence",
  "Outreach",
  "Follow-Ups",
  "CSV Imports",
  "Connectors",
  "Settings",
];

export default function HomePage() {
  const searchConnector = getSearchConnectorStatus();
  const providerConfigured = searchConnector.status === "configured";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">Clear Steps ABA</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">ABA Referral Opportunity Intelligence Engine</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
                Evidence-first discovery for referral sources, demand signals, competitor/market signals, decision-maker targets, outreach preparation, and follow-up workflow. No fake leads, fake runs, or fake dashboard metrics.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-slate-950">Live search provider</p>
              <p className="mt-1">SerpAPI Public Web Search: <span className="font-semibold">{providerConfigured ? "configured" : "not configured"}</span></p>
              <p className="mt-1 text-xs text-slate-500">Required env var: SERPAPI_API_KEY</p>
            </div>
          </div>
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {sections.map((section) => (
              <span key={section} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{section}</span>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-6">
          <section id="dashboard" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Dashboard</p>
                <h2 className="mt-2 text-2xl font-bold">Pipeline starts at zero until real/imported/discovered data exists</h2>
              </div>
              <p className="text-sm text-slate-500">No seeded records.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboardCards.map(([title, value]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
              <p className="font-bold">Recommended next actions</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
                <li>Add SERPAPI_API_KEY in deployment to enable live public discovery.</li>
                <li>Run Lead Discovery for one target city and one source family first.</li>
                <li>Download CSV templates if you already have real referral-source, contact, demand-signal, or competitor data.</li>
                <li>Only outreach after evidence source, role target, phone/email, and short reason are verified.</li>
              </ol>
            </div>
          </section>

          <DiscoveryConsole queryFamilies={queryFamilies} providerConfigured={providerConfigured} />

          <section id="research-runs" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Research Runs</p>
            <h2 className="mt-2 text-2xl font-bold">No saved research runs yet</h2>
            <p className="mt-2 text-sm text-slate-600">Runs will appear only after live search returns real results or after real imported research-run data is added. Delete controls should operate on real saved runs only once persistence is added.</p>
          </section>

          <section id="entities" className="grid gap-4 md:grid-cols-2">
            {[
              ["Referral Sources", "Daycares, preschools, pediatric offices, speech/OT clinics, schools, and community resources backed by evidence."],
              ["Organizations", "Normalized entities grouped by name, domain, phone, address, city/state, and source URL."],
              ["Contacts / Decision-Makers", "Director, owner, administrator, referral coordinator, clinical director, principal, or family-services roles."],
              ["Demand Signals", "Waitlists, shortages, Child Find, developmental screening, autism support, board minutes, parent resources, and service-need language."],
              ["Competitor / Market Signals", "Direct ABA providers, BCBA/RBT hiring, in-home ABA, center-based ABA, and autism therapy provider signals. Do not contact as referral leads."],
              ["Outreach / Follow-Ups", "Draft-only workflow until a real email connector is configured. Mass email must be review-based and compliance-aware."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Empty: no real records exist yet.</p>
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-6">
          <section id="connectors" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Connectors</p>
            <h2 className="mt-2 text-xl font-bold">Provider setup states</h2>
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">SerpAPI Public Web Search</p>
                  <p className="mt-1 text-sm text-slate-600">Server-side Google-search-compatible provider.</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${providerConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{providerConfigured ? "configured" : "needs API key"}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">To enable live public web discovery, add SERPAPI_API_KEY to your environment variables.</p>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 p-4">
              <p className="font-bold">CSV Import</p>
              <p className="mt-1 text-sm text-slate-600">Configured for template downloads and header validation architecture. Blank templates are not treated as data.</p>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 p-4 opacity-80">
              <p className="font-bold">Email / Gmail / Enrichment / Job Boards</p>
              <p className="mt-1 text-sm text-slate-600">Disabled placeholders until real connectors and compliance controls are configured.</p>
            </div>
          </section>

          <section id="imports" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">CSV / Data Imports</p>
            <h2 className="mt-2 text-xl font-bold">Blank templates</h2>
            <p className="mt-2 text-sm text-slate-600">Headers only. No fake rows.</p>
            <div className="mt-4 space-y-2">
              {importTemplates.map((template) => (
                <a key={template.id} href={`/templates/${template.fileName}`} className="block rounded-xl border border-slate-200 p-3 text-sm hover:border-cyan-500 hover:bg-cyan-50">
                  <span className="font-semibold text-slate-950">{template.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{template.description}</span>
                </a>
              ))}
            </div>
          </section>

          <section id="intelligence" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Intelligence / Recommendations</p>
            <h2 className="mt-2 text-xl font-bold">Built-in rulebase</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Query families by referral source and signal type.</li>
              <li>• Classification: referral source, demand signal, competitor, contact target, directory, weak result.</li>
              <li>• Evidence requirements: URL, title, snippet, detected signals, basis, confidence, verification status.</li>
              <li>• Opportunity scoring caps weak or missing evidence.</li>
              <li>• Payor data placeholder: not scored until real data exists.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
