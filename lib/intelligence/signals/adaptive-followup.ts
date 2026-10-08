import { PUBLIC_SIGNAL_RULES } from "./extended-catalog";
import { AGES_2_TO_18_RULES } from "./age-2-18-catalog";
import type { PublicSignalClue } from "./public-signal-scan";
import type { YouthAgeBand } from "./youth-qualification";

const knownRules=new Map([...PUBLIC_SIGNAL_RULES,...AGES_2_TO_18_RULES].map(rule=>[rule.id,rule]));
export interface WeakSignalProbe {
  clueId:string;
  hypothesis:string;
  originalPublishers:number;
  query:string;
  researchOnly:true;
}
/** An unverified clue is a prompt for more PUBLIC AREA-level evidence—not an individual child lead.
 * Perform only a small time-bounded batch per Scout run; rotate through hypotheses on subsequent runs.
 */
export function planWeakSignalFollowups(
  clues:readonly PublicSignalClue[],
  location:string,
  ageBand:"all"|YouthAgeBand,
  max=5,
  rotation=0,
):WeakSignalProbe[] {
  const bounded=Math.max(0,Math.min(6,Math.trunc(max)));
  if(!bounded)return [];
  const known=clues.filter(clue=>!clue.corroborated&&clue.sourceCount>0&&knownRules.has(clue.indicatorId));
  if(!known.length)return [];
  // Diversify: don't use the entire follow-up budget on five variations of the same topic.
  const groups=new Map<string,PublicSignalClue[]>();
  for(const clue of known) {
    const group=groups.get(clue.group)??[];
    group.push(clue);
    groups.set(clue.group,group);
  }
  const sortedGroups=[...groups.entries()].sort((a,b)=>
    (b[1].length-a[1].length)||a[0].localeCompare(b[0]));
  const selected:PublicSignalClue[]=[];
  const start=Math.max(0,Math.trunc(rotation))%(sortedGroups.length||1);
  let round=0;
  while(selected.length<bounded) {
    let added=0;
    for(let i=0;i<sortedGroups.length && selected.length<bounded;i++){
      const pool=sortedGroups[(start+i)%sortedGroups.length][1];
      const item=pool[(round+Math.max(0,Math.trunc(rotation)))%pool.length];
      if(!selected.some(x=>x.indicatorId===item.indicatorId)){
        selected.push(item);added++;
      }
    }
    round++;
    if(!added || round>known.length)break;
  }
  const region=location.replace(/[\n\r"<>]/g," ").replace(/\s+/g," ").trim().slice(0,95);
  const ages=ageBand==="2-5"?"ages 2-5":ageBand==="6-11"?"ages 6-11":
    ageBand==="12-18"?"ages 12-18":"children";
  return selected.map((clue,index)=>{
    const rule=knownRules.get(clue.indicatorId)!;
    const terms=rule.keywords.slice(0,3).map(word=>word.includes(" ")?
      '"'+word.replace(/["]/g,"")+'"':word).join(" ");
    // Query for a new independent publisher, not another result from the original website.
    const exclusions=[...new Set(clue.sourceDomains)].filter(domain=>
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)
    ).slice(0,2).map(domain=>"-site:"+domain).join(" ");
    const angle=["public agency report","local news report","public program update"][index%3];
    return {
      clueId:clue.indicatorId,
      hypothesis:clue.name,
      originalPublishers:clue.sourceCount,
      query:[terms,region,ages,angle,exclusions].filter(Boolean).join(" ").trim().slice(0,280),
      researchOnly:true as const,
    };
  });
}
