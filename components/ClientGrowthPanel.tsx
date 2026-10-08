"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ClipboardCopy, ClipboardList, SearchCheck } from "lucide-react";
import { createTask, loadTasks } from "@/lib/tasks/local-store";
import { clientGrowthTaskBrief, type ClientGrowthPlan } from "@/lib/intelligence/client-growth";

export function ClientGrowthPanel({ plan }: { plan: ClientGrowthPlan }) {
  const [copied,setCopied]=useState(false);
  const [added,setAdded]=useState(false);
  const [error,setError]=useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(clientGrowthTaskBrief(plan));
      setCopied(true);
      setError("");
    } catch {
      setError("Clipboard permission was denied. Use the actions below to review and add tasks.");
    }
  }
  function addTasks() {
    try {
      const locationId=plan.state+":"+plan.location.toLowerCase()+":"+plan.ageBand;
      const existing=new Set(loadTasks().filter((task)=>
        task.entityType==="territory" && task.entityId===locationId
      ).map((task)=>task.title));
      for(const item of plan.actions) {
        const title="Client growth · "+item.title;
        if(existing.has(title))continue; // Do not duplicate assignments on repeated research runs.
        createTask({
          title,
          description:item.description+"\n\nMeasurement: "+item.metric+
            (item.dependency?"\n\nRequired verification: "+item.dependency:"")+
            (item.url?"\n\nResearch URL: "+item.url:"")+
            "\n\n"+plan.ethicalBoundary,
          priority:item.id==="activate_intake"||item.id==="staff_capacity"?"high":"normal",
          entityType:"territory",
          entityId:locationId,
        });
      }
      setAdded(true);
      setError("");
    } catch {
      setError("Tasks could not be saved. Check available device storage.");
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/90 px-4 py-5 sm:px-6" aria-labelledby="growth-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <span className="eyebrow">Client acquisition · Ages {plan.ageBand}</span>
          <h2 id="growth-panel-title" className="mt-2 text-xl font-semibold tracking-tight text-white">Where new families can find your agency</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Actionable growth research for {plan.location}. This is not an ABA provider partnership list.
            Public directories do not reveal identifiable families seeking treatment.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button type="button" onClick={copy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white">
            {copied?<Check size={16}/>:<ClipboardCopy size={16}/>}
            {copied?"Copied":"Copy plan"}
          </button>
          <button type="button" disabled={added} onClick={addTasks}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-70">
            {added?<Check size={16}/>:<ClipboardList size={16}/>}
            {added?"Tasks in workspace":`Create ${plan.actions.length} tasks`}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-xs text-zinc-400">Exact target-age population</span><b className="mt-1 block text-lg tabular-nums text-white">{plan.verifiedTargetPopulation===null?"Not verified":plan.verifiedTargetPopulation.toLocaleString("en-US")}</b></div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-xs text-zinc-400">Direct family inquiries</span><b className="mt-1 block text-lg text-white">Not tracked</b></div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-xs text-zinc-400">Demand validation</span><b className="mt-1 block text-sm text-white">{plan.demandStatus==="documented_public_capacity_signal"?"Institutional clue":"Unverified"}</b></div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-xs text-zinc-400">RBT case capacity</span><b className="mt-1 block text-lg text-white">Unverified</b></div>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{plan.populationBasis}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {plan.actions.map((item,index)=>(
          <article className="rounded-xl border border-white/10 bg-zinc-950/40 p-4" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-200">{index+1}. {item.purpose}</span>
              <span className="text-xs text-zinc-400">{item.status==="prepare"?"Setup needed":"Research"}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-5 text-white">{item.title}</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{item.description}</p>
            <p className="mt-3 text-xs text-zinc-400"><strong className="text-zinc-300">Measure:</strong> {item.metric}</p>
            {item.dependency&&<p className="mt-2 text-xs text-zinc-500"><strong>Before launch:</strong> {item.dependency}</p>}
            {item.url&&<a href={item.url} target={item.url.startsWith("/")?undefined:"_blank"}
              rel={item.url.startsWith("/")?undefined:"noopener noreferrer"}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-orange-200 underline underline-offset-4">
              {item.id==="staff_capacity"?<SearchCheck size={15}/>:<ArrowUpRight size={15}/>}
              {item.id==="staff_capacity"?"Open RBT recruiter":"Open source"}
            </a>}
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-400">
        {plan.ethicalBoundary} Before accepting cases, confirm coverage, payer eligibility, qualified RBT availability and BCBA supervision.
      </p>
    </section>
  );
}