"use client";

import { useState } from "react";

type ConnectorCardProps = {
  title: string;
  status: string;
  requiredEnvVar?: string;
  powers: string[];
  nextStep: string;
  description: string;
};

export function ConnectorCard({ title, status, requiredEnvVar, powers, nextStep, description }: ConnectorCardProps) {
  const [open, setOpen] = useState(false);
  const isConfigured = status === "configured";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between gap-4 p-5 text-left">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{status}</span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-5 pt-4">
          {requiredEnvVar ? <p className="text-sm text-slate-600">Required env var: <span className="font-bold text-slate-950">{requiredEnvVar}</span></p> : null}
          <p className="mt-3 text-sm font-bold text-slate-950">Powers</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {powers.map((power) => <li key={power}>• {power}</li>)}
          </ul>
          <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700"><span className="font-bold">Next step:</span> {nextStep}</p>
        </div>
      ) : null}
    </article>
  );
}
