import type { YouthAgeBand } from "./signals/youth-qualification";
import { publicPublisherId } from "./signals/publisher-evidence";

type TargetState="MO"|"KS"|"CO";
type Demographics={
  geographyName:string;
  geographyKind:string;
  year:number;
  metrics:{
    ages2to18:number|null;
    age3to5:number;
    age6to11:number;
    age12to17:number;
  };
};
type SignalClue={indicatorId:string;corroborated:boolean;sourceDomains:string[]};
export type ClientGrowthActionId="activate_intake"|"google_business"|"local_service_page"|"public_program_research"|"staff_capacity";
export interface ClientGrowthAction {
  id:ClientGrowthActionId;
  title:string;
  status:"prepare"|"research";
  purpose:string;
  description:string;
  metric:string;
  url:string|null;
  dependency:string|null;
}
export interface ClientGrowthPlan {
  mode:"family_acquisition";
  location:string;
  state:TargetState;
  ageBand:YouthAgeBand;
  verifiedTargetPopulation:number|null;
  populationBasis:string;
  demandStatus:"documented_public_capacity_signal"|"unverified";
  independentCapacityPublishers:number;
  directFamilyInquiries:0;
  staffReady:"unverified";
  secureIntakeReady:false;
  ageQualifiedFamiliesFound:0;
  actions:ClientGrowthAction[];
  ethicalBoundary:string;
}
/** These are PUBLIC place-level advertising/research actions. No family identity is inferred. */
function searchUrl(phrase:string) {
  return "https://www.google.com/search?"+new URLSearchParams({q:phrase}).toString();
}
function safePlace(input:string,state:TargetState) {
  const place=input.slice(0,100).replace(/[\n\r<>]/g," ").trim();
  return place || ({MO:"Missouri",KS:"Kansas",CO:"Colorado"} as const)[state];
}
export function buildClientGrowthPlan(input:{
  state:TargetState;location:string;ageBand:YouthAgeBand;demographics:Demographics|null;
  publicClues:readonly SignalClue[];
}):ClientGrowthPlan {
  const {state,ageBand,demographics}=input;
  const place=safePlace(input.location,state);
  const population=demographics?.metrics;
  // County/state total is NOT a city or ZIP denominator. Never borrow county totals.
  const populationApplies=Boolean(demographics &&
    (demographics.geographyKind==="state" || demographics.geographyKind==="county") &&
    (ageBand==="2-18") &&
    population?.ages2to18 != null &&
    Number.isFinite(population.ages2to18) &&
    population.ages2to18>=0);
  const verifiedTargetPopulation=populationApplies?population!.ages2to18:null;
  const populationBasis=populationApplies
    ? "Census "+demographics!.year+" exact ages 2–18, "+demographics!.geographyKind+" estimate (not autism prevalence or ABA eligibility)"
    : "Exact matching age-band population not verified for this location. No extrapolation from a county or another cohort.";
  const publicCapacity=input.publicClues.filter((clue)=>clue.corroborated &&
    /^(service-capacity|clinic-market-movement|school-service-access)\./.test(clue.indicatorId));
  const independentCapacityPublishers=new Set(publicCapacity.flatMap((clue)=>clue.sourceDomains.map(publicPublisherId).filter(Boolean))).size;
  const demandStatus=publicCapacity.length>0&&independentCapacityPublishers>=2
    ?"documented_public_capacity_signal" as const:"unverified" as const;
  const label=ageBand==="2-18"?"children ages 2–18":
    ageBand==="2-5"?"children ages 2–5":
    ageBand==="6-11"?"children ages 6–11":"adolescents ages 12–18";
  return {
    mode:"family_acquisition",
    location:place,state,ageBand,
    verifiedTargetPopulation,populationBasis,demandStatus,independentCapacityPublishers,
    directFamilyInquiries:0,staffReady:"unverified",secureIntakeReady:false,
    ageQualifiedFamiliesFound:0,
    actions:[
      {
        id:"activate_intake",
        title:"Make it possible for a family to reach your agency",
        status:"prepare",
        purpose:"Conversion",
        description:"Publish an agency-verified callback/secure intake destination and service-area/payer information before promoting availability. Do not collect children's diagnoses or contact details in Scout.",
        metric:"Consented family inquiries from your own channels",
        url:null,
        dependency:"A verified business telephone or secure intake URL, approved operational/privacy process, real intake capacity.",
      },
      {
        id:"local_service_page",
        title:"Build one service page for "+place,
        status:"research",
        purpose:"High-intent search",
        description:"Check the search results families already see for ABA therapy in "+place+". Create a truthful local service page for "+label+" only if you actually cover the area and can respond to inquiries.",
        metric:"Qualified inbound calls and secure intake submissions attributable to the page",
        url:searchUrl("ABA therapy for "+label+" "+place),
        dependency:"Confirm in-home service radius, accepting payers, BCBA supervision and current availability.",
      },
      {
        id:"google_business",
        title:"Improve the agency's local search visibility",
        status:"prepare",
        purpose:"Local discovery",
        description:"Verify the agency's legitimate Google Business Profile, service-area settings, current telephone, and public contact button. Do not solicit or fabricate reviews.",
        metric:"Tracked genuine business profile calls and website clicks",
        url:"https://business.google.com/",
        dependency:"Verified agency listing and accurate public service-area information.",
      },
      {
        id:"staff_capacity",
        title:"Recruit and verify RBT coverage before expanding intake",
        status:"prepare",
        purpose:"Staffing readiness",
        description:"Review RBT candidates for geography, in-home travel, schedule, supervision and actual credentials. Do not promise an assignment without staff and clinical approval.",
        metric:"Real staffed, supervised new-case openings",
        url:"/talent",
        dependency:"Confirmed staff availability and supervisor capacity; recruiting search results are not available staff.",
      },
      {
        id:"public_program_research",
        title:"Check age-appropriate local programs and service gaps",
        status:"research",
        purpose:"Community discovery",
        description:demandStatus==="documented_public_capacity_signal"
          ? "Independent public sources report an institutional capacity clue. Verify it directly; this is not evidence identifying a family or proof of an ABA waitlist."
          : "There is not yet a verified public capacity shortage for this location. Research public programs and service-access notices without profiling individual families.",
        metric:"Verified area-level service-access facts and accurate family-facing resources",
        url:searchUrl(place+" "+label+" autism services ABA support resource waitlist"),
        dependency:"Do not infer diagnosis from community posts, school enrollment or an individual address.",
      },
    ],
    ethicalBoundary:"A public source, competitor listing, school, or preschool is market intelligence—not a child or family client lead. Client counts increase only through voluntary, appropriately handled inquiries.",
  };
}

/** A concise operator task brief, not an automatically launched advertisement. */
export function clientGrowthTaskBrief(plan:ClientGrowthPlan):string {
  const a=plan.actions.map((item,index)=>
    (index+1)+". "+item.title+" — "+item.description+
      "\n   Success: "+item.metric+
      (item.dependency?"\n   Gate: "+item.dependency:"")+
      (item.url?"\n   Research: "+item.url:"")
  ).join("\n\n");
  return "Clear Steps ABA — Family Client Acquisition\nArea: "+plan.location+", "+plan.state+
    "\nAge scope: "+plan.ageBand+"\nPublic population: "+
    (plan.verifiedTargetPopulation===null?"Not established for this exact age/geography":plan.verifiedTargetPopulation.toLocaleString("en-US"))+
    "\nSource status: "+plan.demandStatus+
    "\nDirect family inquiries found via public research: 0 (not a failure of intake; public research does not search families)"+
    "\n\n"+a+"\n\n"+plan.ethicalBoundary;
}
