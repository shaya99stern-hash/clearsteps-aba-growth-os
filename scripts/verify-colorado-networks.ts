import assert from "node:assert/strict";
import { parseColoradoChildCare, coloradoPublicReferralNetworkHits } from "../lib/intelligence/official/co-childcare";
import { buildStateSourceContribution } from "../lib/intelligence/official/state-source-contribution";
import { resolveSearchHits } from "../lib/intelligence/entity-resolution";

const rows=[
 {provider_id:101,provider_name:"Bright Hills Child Care Center",provider_service_type:"Child Care Center",
  city:"Denver",county:"Denver",state:"CO",zip:"80204",total_licensed_capacity:75,
  ccrr:"Mile High United Way",ecc:"Denver Early Childhood Council",school_district_operated_program:false},
 {provider_id:102,provider_name:"School-Age Community Academy",provider_service_type:"School age child care",
  city:"Denver",county:"Denver",state:"CO",zip:"80205",total_licensed_capacity:35,
  ccrr:"Mile High United Way",ecc:"Denver Early Childhood Council",school_district_operated_program:true},
 {provider_id:103,provider_name:"Family House",provider_service_type:"Family Child Care Home",
  city:"Denver",county:"Denver",state:"CO",ccrr:"Household Network",ecc:"Residential Liaison"},
 {provider_id:104,provider_name:"North Community Preschool",provider_service_type:"Preschool",
  city:"Aurora",county:"Arapahoe",state:"CO",ccrr:"Arapahoe County CCRR",ecc:"Not applicable"},
 {provider_id:105,provider_name:"West Development Center",provider_service_type:"Child Care Center",
  city:"Denver",county:"Denver",state:"CO",ccrr:"contact@private.example",ecc:"123 Main Street"},
];
const facilities=parseColoradoChildCare(rows);
assert.equal(facilities.length,4,"Residential provider records excluded");
assert.equal(facilities[0].resourceReferral,"Mile High United Way");
assert.equal(facilities[0].earlyChildhoodCouncil,"Denver Early Childhood Council");
assert(facilities.find((x)=>x.id==="102")?.schoolDistrictOperated);
const network=coloradoPublicReferralNetworkHits(facilities,"Denver County, CO");
assert.equal(network.length,3,"Two repeated agency names plus third CCRR, no N/A or person/address fields");
assert(network[0].snippet.includes("2 observed licensed"));
assert(network.every((hit)=>hit.sourceId==="co-cdec-referral-network"));
assert(network.every((hit)=>!hit.snippet.includes("123 Main Street")));
const orgs=resolveSearchHits(network.map((hit)=>({lane:"referral" as const,hit,enrichment:null})),"Denver County, CO");
assert.equal(orgs.length,3,"Each independent public agency identity gets separate lead entry");
assert.equal(new Set(orgs.map((x)=>x.id)).size,3);
assert(orgs.every((x)=>x.evidence.length===1),"Same official dataset must never simulate independent publishers");
assert(orgs.every((x)=>x.emails.length===0&&x.phones.length===0),"Do not invent organization contacts");
const result=buildStateSourceContribution({
  state:"CO",engine:"client",location:"Denver County, CO",under18Population:100_000,coloradoChildCare:facilities,
});
assert.equal(result.referralHits.length,network.length+4);
assert(result.referralHits[0].sourceId==="co-cdec-referral-network","Actual network connections prioritized");
assert.equal(result.observations.length,1,"Agency affiliations must not inflate opportunity observations");
console.log("Colorado agency-network validation passed: real CDEC organizational relationships, duplicate safeguards, no fabricated contacts.");
