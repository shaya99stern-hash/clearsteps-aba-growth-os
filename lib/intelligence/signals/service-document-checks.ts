import { matchesPublishedArea, publicPublisherId } from "./publisher-evidence";
import { isAgeAlignedPublicProgram } from "./target-ages";
import { publicTextCoversYouthAgeBand, type YouthAgeBand } from "./youth-qualification";

/**
 * 30 deterministic parsers + 30 independent-publisher cross-checks for public,
 * area-level service-access evidence. No individual child or parent information.
 * Parsed hints do not increase a demand score by themselves.
 */
export interface ServiceDocumentRule {
  id: string; title: string; pattern: RegExp;
}
export const SERVICE_DOCUMENT_PARSERS: readonly ServiceDocumentRule[] = [
  {id:"intake-waitlist",title:"Published ABA intake waitlist",pattern:/(?:aba|behavior(?:al)? therapy).{0,80}(?:wait\s?list|waiting list|intake delay)/i},
  {id:"assessment-backlog",title:"Child evaluation backlog",pattern:/(?:developmental|autism|pediatric|psychological).{0,80}(?:evaluation|assessment).{0,80}(?:wait\s?list|backlog|delay)/i},
  {id:"evaluation-availability",title:"Pediatric evaluation availability",pattern:/(?:developmental|autism|pediatric).{0,80}(?:evaluation|assessment).{0,80}(?:available|appointment|new slots)/i},
  {id:"intake-closure",title:"Temporary program intake closure",pattern:/(?:closed to new|not accepting new|paused intake|intake closed).{0,70}(?:patients|families|clients|referrals|intake|services)/i},
  {id:"intake-reopening",title:"Program intake reopening",pattern:/(?:now accepting|accepting new|reopening intake|new patient openings).{0,80}(?:children|families|patients|clients|aba|referrals)/i},
  {id:"pediatric-shortage",title:"Pediatric services shortage",pattern:/(?:pediatric|child health).{0,80}(?:shortage|underserved|lack of|care gap)/i},
  {id:"rbt-vacancies",title:"Behavior technician vacancy pressure",pattern:/(?:rbt|behavior technician).{0,70}(?:vacancies|shortage|unfilled positions|recruiting|hiring)/i},
  {id:"bcba-vacancies",title:"Behavior analyst vacancy pressure",pattern:/(?:bcba|behavior analyst).{0,70}(?:vacancies|shortage|unfilled positions|recruiting|hiring)/i},
  {id:"pediatric-expansion",title:"Pediatric provider service expansion",pattern:/(?:pediatric|children's hospital).{0,90}(?:new location|expanded|expansion|opened new)/i},
  {id:"clinic-opening",title:"ABA program opening",pattern:/(?:aba clinic|autism center|behavioral therapy).{0,80}(?:opening|new location|opened|launch)/i},
  {id:"clinic-closing",title:"ABA provider closure",pattern:/(?:aba clinic|autism center|behavioral therapy).{0,70}(?:closed|closure|shut down|closing)/i},
  {id:"provider-directory-change",title:"Published provider directory update",pattern:/(?:provider directory|provider network|provider list).{0,80}(?:updated|new providers|revised|changed)/i},
  {id:"provider-directory-gap",title:"Inadequate provider directory access",pattern:/(?:provider directory|provider network).{0,80}(?:outdated|incorrect|no available providers|inaccurate)/i},
  {id:"child-population-growth",title:"Growing youth population",pattern:/(?:children|child population|youth population).{0,90}(?:growth|increased|increase|population projection)/i},
  {id:"childcare-shortage",title:"County child care shortage",pattern:/(?:child care|childcare|daycare).{0,100}(?:shortage|gap|desert|not enough|waitlist)/i},
  {id:"childcare-capacity",title:"Published licensed child care capacity",pattern:/(?:licensed child care|childcare providers|child care centers).{0,85}(?:capacity|openings|slots|available spaces|providers)/i},
  {id:"preschool-enrollment",title:"Preschool enrollment and service access",pattern:/(?:preschool|pre-k|early childhood).{0,80}(?:enrollment|enrolment|admissions|openings|waitlist)/i},
  {id:"preschool-sped",title:"Preschool special education capacity",pattern:/(?:preschool|pre-k).{0,90}(?:special education|inclusive classroom|developmental support).{0,70}(?:capacity|shortage|staffing|services)/i},
  {id:"child-find-screening",title:"Public Child Find screening",pattern:/(?:child find|early childhood screening).{0,90}(?:screening|evaluation|referral|schedule)/i},
  {id:"early-intervention-transition",title:"Early intervention transition services",pattern:/(?:early intervention|first steps|part c).{0,100}(?:transition|preschool|part b|school age)/i},
  {id:"district-evaluation",title:"School district evaluation delays",pattern:/(?:school district|special education).{0,90}(?:evaluation|assessment).{0,80}(?:wait|delay|backlog)/i},
  {id:"medicaid-policy",title:"Medicaid ABA program notice",pattern:/(?:medicaid|kan care|kancare|health first colorado|mo healthnet).{0,95}(?:aba|behavior therapy).{0,80}(?:coverage|notice|bulletin|policy)/i},
  {id:"medicaid-access",title:"Published Medicaid ABA provider gap",pattern:/(?:medicaid|kancare|mo healthnet).{0,100}(?:provider shortage|network gap|access barrier|provider availability)/i},
  {id:"payer-contract",title:"Public ABA insurance network update",pattern:/(?:insurance|payer|health plan).{0,100}(?:aba|behavioral services).{0,75}(?:network|credentialing|authorization)/i},
  {id:"transport-barrier",title:"Youth service transportation barrier",pattern:/(?:transportation|transit|travel).{0,80}(?:therapy|pediatric|child services).{0,65}(?:barrier|access|distance|underserved)/i},
  {id:"rural-access",title:"Rural pediatric service access pressure",pattern:/(?:rural|frontier).{0,85}(?:pediatric|autism services|behavioral health).{0,80}(?:shortage|access|service gap)/i},
  {id:"family-navigation",title:"Family resource navigation expansion",pattern:/(?:family resource center|family navigator|family support services).{0,90}(?:expansion|opening|directory|added|new program)/i},
  {id:"school-board-plan",title:"Public school board special education planning",pattern:/(?:school board|district budget).{0,95}(?:special education|student services|child find).{0,75}(?:funding|capacity|staffing|plan)/i},
  {id:"program-grant",title:"Funded youth developmental services",pattern:/(?:grant|funding award|appropriation).{0,90}(?:child development|autism services|early intervention|pediatric services)/i},
  {id:"community-needs",title:"Community health child services assessment",pattern:/(?:community health needs assessment|chna).{0,95}(?:children|pediatric|youth|developmental)/i}
];

export interface ServiceDocumentCheck { id: string; left: string; right: string; title: string }
export const SERVICE_DOCUMENT_CHECKS: readonly ServiceDocumentCheck[] = [
  {
    "id": "D01",
    "left": "intake-waitlist",
    "right": "pediatric-shortage",
    "title": "Published ABA intake waitlist × Pediatric services shortage"
  },
  {
    "id": "D02",
    "left": "assessment-backlog",
    "right": "child-find-screening",
    "title": "Child evaluation backlog × Public Child Find screening"
  },
  {
    "id": "D03",
    "left": "evaluation-availability",
    "right": "provider-directory-change",
    "title": "Pediatric evaluation availability × Published provider directory update"
  },
  {
    "id": "D04",
    "left": "intake-closure",
    "right": "clinic-closing",
    "title": "Temporary program intake closure × ABA provider closure"
  },
  {
    "id": "D05",
    "left": "intake-reopening",
    "right": "clinic-opening",
    "title": "Program intake reopening × ABA program opening"
  },
  {
    "id": "D06",
    "left": "pediatric-shortage",
    "right": "rural-access",
    "title": "Pediatric services shortage × Rural pediatric service access pressure"
  },
  {
    "id": "D07",
    "left": "rbt-vacancies",
    "right": "clinic-opening",
    "title": "Behavior technician vacancy pressure × ABA program opening"
  },
  {
    "id": "D08",
    "left": "bcba-vacancies",
    "right": "rbt-vacancies",
    "title": "Behavior analyst vacancy pressure × Behavior technician vacancy pressure"
  },
  {
    "id": "D09",
    "left": "pediatric-expansion",
    "right": "evaluation-availability",
    "title": "Pediatric provider service expansion × Pediatric evaluation availability"
  },
  {
    "id": "D10",
    "left": "clinic-opening",
    "right": "provider-directory-change",
    "title": "ABA program opening × Published provider directory update"
  },
  {
    "id": "D11",
    "left": "clinic-closing",
    "right": "provider-directory-gap",
    "title": "ABA provider closure × Inadequate provider directory access"
  },
  {
    "id": "D12",
    "left": "provider-directory-change",
    "right": "intake-reopening",
    "title": "Published provider directory update × Program intake reopening"
  },
  {
    "id": "D13",
    "left": "provider-directory-gap",
    "right": "medicaid-access",
    "title": "Inadequate provider directory access × Published Medicaid ABA provider gap"
  },
  {
    "id": "D14",
    "left": "child-population-growth",
    "right": "childcare-shortage",
    "title": "Growing youth population × County child care shortage"
  },
  {
    "id": "D15",
    "left": "childcare-shortage",
    "right": "childcare-capacity",
    "title": "County child care shortage × Published licensed child care capacity"
  },
  {
    "id": "D16",
    "left": "childcare-capacity",
    "right": "preschool-enrollment",
    "title": "Published licensed child care capacity × Preschool enrollment and service access"
  },
  {
    "id": "D17",
    "left": "preschool-enrollment",
    "right": "preschool-sped",
    "title": "Preschool enrollment and service access × Preschool special education capacity"
  },
  {
    "id": "D18",
    "left": "preschool-sped",
    "right": "district-evaluation",
    "title": "Preschool special education capacity × School district evaluation delays"
  },
  {
    "id": "D19",
    "left": "child-find-screening",
    "right": "early-intervention-transition",
    "title": "Public Child Find screening × Early intervention transition services"
  },
  {
    "id": "D20",
    "left": "early-intervention-transition",
    "right": "district-evaluation",
    "title": "Early intervention transition services × School district evaluation delays"
  },
  {
    "id": "D21",
    "left": "district-evaluation",
    "right": "school-board-plan",
    "title": "School district evaluation delays × Public school board special education planning"
  },
  {
    "id": "D22",
    "left": "medicaid-policy",
    "right": "payer-contract",
    "title": "Medicaid ABA program notice × Public ABA insurance network update"
  },
  {
    "id": "D23",
    "left": "medicaid-access",
    "right": "pediatric-shortage",
    "title": "Published Medicaid ABA provider gap × Pediatric services shortage"
  },
  {
    "id": "D24",
    "left": "payer-contract",
    "right": "provider-directory-gap",
    "title": "Public ABA insurance network update × Inadequate provider directory access"
  },
  {
    "id": "D25",
    "left": "transport-barrier",
    "right": "rural-access",
    "title": "Youth service transportation barrier × Rural pediatric service access pressure"
  },
  {
    "id": "D26",
    "left": "rural-access",
    "right": "program-grant",
    "title": "Rural pediatric service access pressure × Funded youth developmental services"
  },
  {
    "id": "D27",
    "left": "family-navigation",
    "right": "child-find-screening",
    "title": "Family resource navigation expansion × Public Child Find screening"
  },
  {
    "id": "D28",
    "left": "school-board-plan",
    "right": "program-grant",
    "title": "Public school board special education planning × Funded youth developmental services"
  },
  {
    "id": "D29",
    "left": "program-grant",
    "right": "community-needs",
    "title": "Funded youth developmental services × Community health child services assessment"
  },
  {
    "id": "D30",
    "left": "community-needs",
    "right": "child-population-growth",
    "title": "Community health child services assessment × Growing youth population"
  }
];

export interface ServiceDocumentFinding {
  id: string;
  title: string;
  publishers: number;
  status: "supported" | "partial" | "unobserved";
}
type Candidate = { host: string; text: string };
const PRIVATE = /\b(?:my (?:child|son|daughter)|our home|home address|house at)\b.{0,130}\b(?:autis|disab|developmental|therap)/i;
const negatedWaitlist = /\b(?:no|zero|without|eliminated|cleared)\s+(?:current\s+)?(?:waitlist|waiting list|backlog|shortage)\b/i;
function canonicalHost(value: string): string | null {
  const host = value.trim().toLowerCase().replace(/^www\./, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? publicPublisherId(host) : null;
}
function ageAligned(text: string, band: "all" | YouthAgeBand) {
  return band === "all" || (band === "2-18" ? isAgeAlignedPublicProgram(text) : publicTextCoversYouthAgeBand(text, band));
}

export function runServiceDocumentChecks(candidates: readonly Candidate[], location: string, ageBand: "all" | YouthAgeBand) {
  // Only validated locality + age and public institutional page text qualify.
  const parsed = new Map<string, Set<string>>();
  const institutional = new Map<string, Set<string>>();
  for (const item of candidates.slice(0, 250)) {
    const publisher = canonicalHost(item.host);
    if (!publisher || PRIVATE.test(item.text) || !matchesPublishedArea(item.text, location) || !ageAligned(item.text, ageBand)) continue;
    for (const rule of SERVICE_DOCUMENT_PARSERS) {
      if (!rule.pattern.test(item.text)) continue;
      if ((rule.id.includes("waitlist") || rule.id.includes("shortage") || rule.id.includes("backlog")) && negatedWaitlist.test(item.text)) continue;
      const list = parsed.get(rule.id) ?? new Set<string>();
      list.add(publisher); parsed.set(rule.id,list);
      if (/\.(?:gov|edu)$/.test(publisher)) {
        const pubs=institutional.get(rule.id)??new Set<string>();
        pubs.add(publisher); institutional.set(rule.id,pubs);
      }
    }
  }
  const findings: ServiceDocumentFinding[] = SERVICE_DOCUMENT_CHECKS.map((check) => {
    const left = parsed.get(check.left) ?? new Set<string>();
    const right = parsed.get(check.right) ?? new Set<string>();
    const all = new Set([...left,...right]);
    const authoritative = (institutional.get(check.left)?.size ?? 0) + (institutional.get(check.right)?.size ?? 0) > 0;
    // 2 independent sources for EACH assertion and a third distinct publisher
    // collectively. A single authoritative page never confirms both categories.
    const supported = left.size >= 2 && right.size >= 2 && all.size >= 3 && authoritative;
    return {
      id: check.id,
      title: check.title,
      publishers: all.size,
      status: supported ? "supported" : all.size > 0 ? "partial" : "unobserved",
    };
  });
  return {
    parsedCategories: [...parsed.keys()],
    findings,
    supported: findings.filter((check) => check.status === "supported").length,
  };
}
