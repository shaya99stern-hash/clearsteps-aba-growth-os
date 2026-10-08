import assert from "node:assert/strict";
import { AGE_BANDS, ageBandSearchQueries, qualifyYouthLead, publicTextCoversYouthAgeBand, youthLeadPriority } from "../lib/intelligence/signals/youth-qualification";
import { scanPublicSignals } from "../lib/intelligence/signals/public-signal-scan";
import type { ResolvedLead, SearchEvidence, PublicSearchHit } from "../lib/intelligence/source-types";

const observation=(domain:string,summary:string):SearchEvidence=>({
 id:domain+summary,sourceId:"public-source",title:"Regional Child Referral Center",url:"https://"+domain+"/public-pediatric-program",
 snippet:summary,query:"public organization service age",capturedAt:"2026-10-08",purpose:"discover",
});
function lead(name:string, snippets:Array<[string,string]>,kind:ResolvedLead["kind"]="referral"):ResolvedLead {
 return {id:"organization-example",name,kind,score:50,confidence:55,reasons:[],unknowns:[],
 emails:[],phones:[],signals:[],evidence:snippets.map(([domain,summary])=>observation(domain,summary))};
}
assert.equal(Object.keys(AGE_BANDS).length,4);
assert.deepEqual(Object.keys(AGE_BANDS),["2-18","2-5","6-11","12-18"]);
assert(publicTextCoversYouthAgeBand("Clinic serves ages 2-18","2-5"));
assert(publicTextCoversYouthAgeBand("Clinic serves ages 2-18","6-11"));
assert(publicTextCoversYouthAgeBand("Clinic serves ages 2-18","12-18"));
assert(!publicTextCoversYouthAgeBand("Preschool intake now open","2-5"),"School labels are research hints, not documented age policies");
assert(!publicTextCoversYouthAgeBand("Ages 3-5 accepted","2-5"),"3–5 is only a subset of 2–5");
assert(!publicTextCoversYouthAgeBand("Ages 2-5 accepted","6-11"));
assert(ageBandSearchQueries("6-11","Denver, CO").every(x=>x.includes("6-11")));
assert(!ageBandSearchQueries("2-5","Boulder County").some(x=>x.includes("home address")));

const aligned=lead("Northwind Pediatric Speech Therapy",[
 ["northwind.org","Pediatric speech therapy clinic serving ages 2-18"],
 ["county.gov","Northwind Pediatric Speech Therapy accepts children ages 2-18"],
]);
const ages=qualifyYouthLead(aligned,"6-11");
assert.equal(ages.organizationRole,"potential_referral");
assert.equal(ages.ageStatus,"documented");
assert.equal(ages.supportingPublishers,2);
assert.equal(ages.qualifiedForOutreach,false,"Evidence alone does not authorize referral solicitation");
assert(ages.missingChecks.some(x=>/referrals/.test(x)));
const preschool=qualifyYouthLead(lead("Oakwood Inclusive Preschool",[["school.edu","Public preschool child find referral program"]]),"2-5");
assert.equal(preschool.organizationRole,"school_program");
assert.equal(preschool.ageStatus,"possible");
assert.equal(preschool.supportingPublishers,0);
assert(youthLeadPriority(ages)>youthLeadPriority(preschool));

const older=qualifyYouthLead(aligned,"12-18");
assert.equal(older.ageStatus,"documented");
const excluded=qualifyYouthLead(lead("Northwind Pediatric Speech Therapy",[["northwind.org","Ages 2-5 only"]]),"12-18");
assert.equal(excluded.ageStatus,"outside");
const partial=qualifyYouthLead(lead("Northwind Pediatric Speech Therapy",[["northwind.org","Ages 13-18 only"]]),"12-18");
assert.equal(partial.ageStatus,"mixed");
const conflict=qualifyYouthLead(lead("Northwind Pediatric Speech Therapy",[
 ["northwind.org","Ages 2-18 currently accepted"],["regionalnews.com","Ages 19-25 accepted only"],
]),"6-11");
assert.equal(conflict.ageStatus,"conflicting");
const duplicate=qualifyYouthLead(lead("Northwind Pediatric Speech Therapy",[
 ["northwind.org","Ages 2-18 clinic services"],["www.northwind.org","Ages 2-18 clinic services"],
]),"6-11");
assert.equal(duplicate.supportingPublishers,1,"Repeated hostnames from the same publisher are a single age-policy source");
const privacy=qualifyYouthLead(lead("Northwind Pediatric Speech Therapy",[
 ["forum.com","My son ages 2-18 lives at our house"],
]),"2-5");
assert.equal(privacy.ageStatus,"unknown","Family testimony does not establish service policy");

function hit(host:string,text:string):PublicSearchHit {
 return {title:text,snippet:"Denver CO public municipal report "+text,url:"https://"+host+"/report",query:"Denver CO child therapy",sourceId:"bing-rss",rank:1};
}
const narrow=scanPublicSignals([
 hit("clinic.gov","ABA waitlist in local program ages 2-5"),
 hit("journal.org","ABA waitlist in preschool program ages 2-5"),
],"2026-10-08","Denver, CO","2-5");
assert.equal(narrow.ageRange?.join("-"),"2-5");
assert(narrow.observations.some(x=>x.indicatorId==="service-capacity.01"));
const wrong=scanPublicSignals([
 hit("clinic.gov","ABA waitlist in local program ages 2-5"),
 hit("journal.org","ABA waitlist in preschool program ages 2-5"),
],"2026-10-08","Denver, CO","12-18");
assert.equal(wrong.observations.length,0,"Age 2–5 cannot corroborate teen service accessibility");
console.log("Youth age lanes, documented versus possible institution roles, independent publishers, conflicting public age claims and no household attribution passed.");
