import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";
import { importTemplates } from "@/lib/import/templates";

export default function CsvImportsPage() {
  return (
    <PageShell title="CSV / Data Imports" description="Import real organization-level referral data using blank templates. Blank templates are never treated as data.">
      <div className="space-y-6">
        <EmptyState title="No imported data yet" description="Upload preview and persistence are planned. Current templates are downloadable and header-driven with no seeded rows." />
        <InfoCard title="Template downloads">
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {importTemplates.map((template) => (
              <a key={template.id} href={`/templates/${template.fileName}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-800 hover:border-cyan-400 hover:bg-cyan-50">
                {template.name}
                <span className="mt-1 block text-xs font-normal text-slate-500">{template.fileName}</span>
              </a>
            ))}
          </div>
        </InfoCard>
        <InfoCard title="Upload placeholder" description="Future upload flow: select CSV, validate headers, preview rows, show errors, then import only real rows with evidence fields." />
      </div>
    </PageShell>
  );
}
