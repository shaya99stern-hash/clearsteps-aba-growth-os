export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            ABA Lead Machine
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Referral intelligence engine for ABA growth.
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Pull, organize, score, and prioritize high-potential ABA referral
            sources from public web data, provider directories, clinics,
            schools, daycares, and therapy networks.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Total Leads" value="0" />
          <DashboardCard title="High Fit" value="0" />
          <DashboardCard title="Missing Contact" value="0" />
          <DashboardCard title="Ready to Outreach" value="0" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Lead Search</h2>
            <p className="mt-2 text-slate-400">
              Search by state, city, source type, or referral category.
            </p>

            <div className="mt-5 space-y-3">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Example: autism daycares in New Jersey"
              />

              <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
                Start Lead Research
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Intelligence Signals</h2>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• ABA center expansion</li>
              <li>• Hiring activity</li>
              <li>• Waitlist pressure</li>
              <li>• Referral-source fit</li>
              <li>• Decision-maker/contact gaps</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}