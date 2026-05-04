import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "./AppNav";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">
            Clear Steps ABA
          </Link>
          <div className="mt-3 max-w-4xl">
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">{description}</p>
          </div>
          <div className="mt-6">
            <AppNav />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
    </main>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export function InfoCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}
