"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { loadCrmLeads, updateCrmStage, type PipelineStage, type SavedCrmLead, type TalentStage } from "@/lib/crm/local-store";

const REFERRAL_STAGES: PipelineStage[] = ["Discovered", "Researched", "Qualified", "Contact Ready", "Outreach", "Engaged", "Referral Partner", "Referral Received"];
const TALENT_STAGES: TalentStage[] = ["Discovered", "Verified", "Contacted", "Replied", "Screen", "Interview", "Credentialing", "Hired"];

export function CrmPipeline({ mode }: { mode: "referral" | "talent" }) {
  const [leads, setLeads] = useState<SavedCrmLead[]>([]);
  useEffect(() => setLeads(loadCrmLeads()), []);
  const filtered = useMemo(() => leads.filter((lead) => lead.pipeline === mode), [leads, mode]);
  const stages: Array<PipelineStage | TalentStage> = mode === "referral" ? REFERRAL_STAGES : TALENT_STAGES;

  function advance(lead: SavedCrmLead) {
    const index = stages.indexOf(lead.stage);
    if (index < 0 || index >= stages.length - 1) return;
    setLeads(updateCrmStage(lead.id, stages[index + 1]));
  }

  return (
    <div className="crmBoard">
      <div className="boardScroller">
        {stages.map((stage) => {
          const stageLeads = filtered.filter((lead) => lead.stage === stage);
          return (
            <section className="boardColumn" key={stage}>
              <header><span>{stage}</span><b>{stageLeads.length}</b></header>
              <div className="boardCards">
                {stageLeads.map((lead) => (
                  <article className="crmCard" key={lead.id}>
                    <div className="crmScore">{lead.score}</div>
                    <h3>{lead.name}</h3>
                    <p>{lead.location || lead.domain || lead.kind}</p>
                    <div className="crmMeta"><span>{lead.confidence}% confidence</span><span>{lead.evidence.length} sources</span></div>
                    <div className="crmActions">
                      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" aria-label="Open public source"><ExternalLink size={14} /></a>}
                      <button type="button" onClick={() => advance(lead)} disabled={stage === stages[stages.length - 1]}>
                        <ArrowRight size={14} /> Advance
                      </button>
                    </div>
                  </article>
                ))}
                {stageLeads.length === 0 && <div className="columnEmpty">No records</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
