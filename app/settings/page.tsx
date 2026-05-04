import { InfoCard, PageShell } from "@/components/PageShell";

const serviceStates = ["NJ", "MO"];
const insurance = ["Cigna", "Optum", "MHS", "Aetna", "Anthem"];
const compliance = [
  "Physical mailing address required before any bulk outreach workflow",
  "Unsubscribe footer required",
  "Daily send limit required",
  "Manual review required before outreach",
  "Organization-level referral intelligence only",
];

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Operational settings placeholders for Clear Steps ABA territory, insurance, and outreach compliance controls.">
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Service states">
          <div className="flex flex-wrap gap-2 text-sm">
            {serviceStates.map((state) => <span key={state} className="rounded-full bg-cyan-50 px-3 py-1 font-bold text-cyan-800">{state}</span>)}
          </div>
        </InfoCard>
        <InfoCard title="Accepted insurance placeholders">
          <div className="flex flex-wrap gap-2 text-sm">
            {insurance.map((name) => <span key={name} className="rounded-full bg-slate-50 px-3 py-1 font-bold text-slate-700">{name}</span>)}
          </div>
        </InfoCard>
        <InfoCard title="Compliance requirements">
          <ul className="space-y-2 text-sm text-slate-600">
            {compliance.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </InfoCard>
      </div>
    </PageShell>
  );
}
