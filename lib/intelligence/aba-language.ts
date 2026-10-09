/**
 * Domain-specific language layer for operator-entered public ABA research.
 * This is NOT a universal dictionary or an LLM. Unknown words and proper
 * names are preserved; corrections are conservative and explainable.
 */
export type AbaLanguageKind = "client" | "referral" | "staffing" | "market" | "community" | "evidence" | "age";
export type AbaResearchEngine = "client" | "rbt" | "bcba";
type LexiconEntry = { id: string; kind: AbaLanguageKind; canonical: string; variants: readonly string[] };

function entry(id: string, kind: AbaLanguageKind, canonical: string, variants: string): LexiconEntry {
  return { id, kind, canonical, variants: variants.split("|").map((term) => term.trim()).filter(Boolean) };
}

/**
 * Explicit aliases cover ABA vocabulary, parent phrasing, staffing, sources,
 * insurance, and service-access signals. Never infer a medical diagnosis.
 */
export const ABA_LEXICON: readonly LexiconEntry[] = [
  entry("aba", "client", "ABA therapy", "aba|applied behavior analysis|applied behavioural analysis|behavior analysis therapy|behaviour analysis therapy|behavioral therapy|behavioural therapy"),
  entry("autism", "client", "autism services", "autism|autistic|asd|autism spectrum disorder|autism spectrum|on the spectrum|neurodevelopmental"),
  entry("clients", "client", "families seeking ABA therapy", "clients|client|new clients|new patients|patients|families|parents|caregivers|guardians|children needing services|kids needing help|children seeking therapy"),
  entry("client-acquisition", "client", "ABA therapy client acquisition", "find clients|get clients|find families|get families|attract families|more clients|increase caseload|grow my agency|fill openings|find new patients|client acquisition|family acquisition|new enrollments|get children services|new referrals"),
  entry("intake", "client", "ABA intake access", "intake|intakes|enrollment|enrolment|onboarding|intake calls|intake request|new admissions|openings for services|new inquiries|family inquiry|family inquiries"),
  entry("consent", "client", "consenting family inquiries", "consent|opt in|opt-in|consenting|voluntary inquiry|secure intake|privacy safe|parent submitted|parent initiated"),
  entry("access", "client", "ABA therapy service access", "service access|find treatment|find help|need a therapist|therapy availability|available providers|local availability|access to aba|access to care|access barriers"),
  entry("waitlist", "community", "ABA therapy waitlists", "waitlist|waitlists|wait list|waiting list|wait lists|waiting lists|long waits|waiting time|backlog|queued families|delays in care"),
  entry("shortage", "community", "ABA therapy capacity shortage", "shortage|not enough|underserved|under served|unmet demand|unmet need|not served|service gap|care gap|capacity gap|lack of services|scarcity"),
  entry("demand", "market", "ABA therapy market demand", "demand|need|growth potential|high demand|search demand|market size|opportunity|opportunities|expansion potential|service pressure"),
  entry("territory", "market", "ABA territory analysis", "territory|territories|county|counties|zip|zip code|postal code|area|region|metro|city|cities|neighborhood|neighbourhood|market area"),
  entry("competition", "market", "ABA provider competition", "competitor|competitors|other agencies|aba agencies|aba providers|provider density|competing clinics|competition|local clinics|market share|existing providers"),
  entry("reviews", "market", "public ABA provider reviews", "reviews|review sites|google reviews|yelp|complaints|client feedback|public ratings|reputation|testimonials|parent feedback|service reviews"),
  entry("growth", "market", "ABA growth strategy", "grow|growth|expand|expansion|new location|launch|open a clinic|opening location|territory launch|coverage expansion"),
  entry("medicaid", "market", "Medicaid ABA coverage", "medicaid|state medicaid|mo healthnet|kan care|kancare|health first colorado|healthfirst colorado|managed medicaid|medical assistance"),
  entry("payers", "market", "ABA insurance networks", "insurance|insurers|payer|payor|payers|payors|in network|out of network|commercial insurance|credentialing|network access"),
  entry("reimbursement", "market", "ABA reimbursement and billing", "reimbursement|rates|fee schedule|billing|claims|authorization|prior auth|prior authorization|units|denials"),
  entry("referrals", "referral", "ABA referral pathways", "referral|referrals|refer|referred|referring|referring offices|referral sources|referral pathway|referral network|referral coordinator|care navigation"),
  entry("pediatrics", "referral", "pediatric practices", "pediatrician|pediatricians|paediatrician|pediatrics|pediatric office|pediatric clinic|children's doctor|kids doctor|family pediatrics|pediatric practice"),
  entry("developmental-pediatrics", "referral", "developmental pediatrics", "developmental pediatrician|developmental pediatrics|developmental screening|developmental diagnosis|developmental evaluation|developmental clinic|developmental medicine"),
  entry("child-psychology", "referral", "child psychology assessments", "child psychologist|child psychologists|pediatric psychology|clinical psychologist|psych evaluation|psychological evaluation|psych assessment|diagnostic psychology"),
  entry("speech", "referral", "pediatric speech therapy", "speech therapy|speech therapist|speech pathologist|speech language pathologist|speech language|slp|speech delay|speech clinic|speech language therapy"),
  entry("occupational", "referral", "pediatric occupational therapy", "occupational therapy|occupational therapist|ot|pediatric ot|sensory therapy|sensory clinic|occupational therapists|sensory integration"),
  entry("early-intervention", "referral", "early intervention programs", "early intervention|ei|birth to three|birth to 3|first steps|infant toddler|developmental delay program|early childhood intervention|infant development"),
  entry("preschool", "referral", "preschools", "preschool|preschools|pre school|pre k|pre-k|prek|nursery school|early childhood school|early learning center|montessori"),
  entry("childcare", "referral", "licensed child care", "daycare|day care|childcare|child care|day care center|daycare center|nursery|child care center|licensed child care|early learning"),
  entry("schools", "referral", "school-based student services", "school|schools|school district|school districts|special education|special ed|school social worker|district office|elementary school|school counselor"),
  entry("child-find", "referral", "Child Find programs", "child find|childfind|idea part b|idea part c|part c|evaluation services|school screening|public school evaluation|early childhood assessment"),
  entry("iep", "referral", "special education IEP access", "iep|individualized education program|individualized education plan|504 plan|special education services|educational evaluation|special education"),
  entry("family-resources", "referral", "family resource centers", "family resource center|family support center|parent resources|resource navigator|care coordinator|family navigation|family center|family support nonprofit"),
  entry("community", "community", "public community support signals", "community|community need|parent group|parent resources|parent association|local nonprofits|public forum|support groups|autism resource fair|community event"),
  entry("public-discussions", "community", "aggregated public discussions", "reddit|facebook public pages|discussion|public forums|public posts|community board|online community|discussion boards"),
  entry("public-records", "evidence", "official public records", "public record|public records|public data|government data|open data|official listings|state registry|licensing database|licensed centers|government reports"),
  entry("census", "evidence", "U.S. Census child population", "census|acs|american community survey|population|demographics|child population|population trends|age distribution|population by age|census tract"),
  entry("nppes", "evidence", "CMS NPPES organizations", "nppes|npi|national provider identifier|provider registry|cms provider registry|taxonomy code|provider taxonomy|npi directory"),
  entry("cross-reference", "evidence", "independent source corroboration", "cross reference|cross-reference|cross check|crosscheck|corroborate|verify|verification|double check|independent publishers|source confidence|multiple sources|evidence"),
  entry("sources", "evidence", "public research sources", "sources|source|public datasets|registries|directories|web research|research material|published reports|data feeds|collectors"),
  entry("state-regulators", "evidence", "state licensing and service rules", "licensure|licensing|licensed|state rules|regulations|compliance|regulatory|state department|health department|official authority"),
  entry("rbt", "staffing", "RBT hiring", "rbt|rbts|registered behavior technician|registered behaviour technician|behavior technician|behaviour technician|behavioral technician|aba technician|rbt staff|technicians"),
  entry("bcba", "staffing", "BCBA hiring", "bcba|bcbas|board certified behavior analyst|board certified behavioural analyst|behavior analyst|behaviour analyst|lba|licensed behavior analyst|supervisor|clinical supervisor"),
  entry("staff", "staffing", "ABA staffing capacity", "staff|staffing|workers|workforce|employees|employee|team|clinicians|coverage|staffing gap|open shifts|staff shortage"),
  entry("hiring", "staffing", "ABA hiring opportunities", "hire|hiring|recruit|recruiting|recruitment|job openings|jobs|job postings|job vacancies|careers|candidate|candidates|talent|applicants"),
  entry("training", "staffing", "ABA workforce training", "training|trained|certification|credential|credentials|qualification|competency|supervision hours|fieldwork|rbt training"),
  entry("scheduling", "staffing", "ABA staffing availability", "schedule|scheduling|caseload assignment|case coverage|shift coverage|availability|service hours|supervision coverage|patient scheduling"),
  entry("pay", "staffing", "ABA workforce compensation", "pay|salary|salaries|hourly wage|wages|compensation|benefits|employment package|job offer"),
  entry("ages-2-18", "age", "children ages 2–18", "ages 2 18|ages 2 to 18|2 to 18|2-18|2–18|kids ages 2 through 18|children ages 2 through 18|pediatric ages"),
  entry("ages-2-5", "age", "children ages 2–5", "ages 2 5|2-5|2–5|toddlers and preschoolers|preschool age|early childhood ages|2 to 5"),
  entry("ages-6-11", "age", "children ages 6–11", "ages 6 11|6-11|6–11|elementary age|school aged children|elementary students|6 to 11"),
  entry("ages-12-18", "age", "children ages 12–18", "ages 12 18|12-18|12–18|teenagers|teens|adolescents|adolescent services|12 to 18"),
] as const;

export const ABA_COMMON_MISSPELLINGS: Readonly<Record<string, string>> = {
  abaah:"aba", appplied:"applied", appled:"applied", behavour:"behavior", behavioural:"behavioral",
  behavor:"behavior", behavoir:"behavior", behavorial:"behavioral", behavoiral:"behavioral",
  behavorist:"behaviorist", theraphy:"therapy", therpy:"therapy", therapie:"therapy",
  referal:"referral", referals:"referrals", refferal:"referral", refferals:"referrals",
  referrel:"referral", referrral:"referral", refferred:"referred", refering:"referring",
  pedatric:"pediatric", pediatrican:"pediatrician", pediatrition:"pediatrician",
  pediatritian:"pediatrician", pedatrician:"pediatrician", pediatrian:"pediatrician",
  pediatricts:"pediatrics", peadiatric:"pediatric", pediactric:"pediatric",
  preeschool:"preschool", preshool:"preschool", preeschools:"preschools",
  daycaare:"daycare", daycares:"daycare", childcar:"childcare", chilcare:"childcare",
  occupatinal:"occupational", ocupational:"occupational", occuptional:"occupational",
  speach:"speech", speachtherapy:"speech therapy", speachpathology:"speech pathology",
  psycologist:"psychologist", psycologists:"psychologists", psycholigist:"psychologist",
  autisim:"autism", autsim:"autism", autsism:"autism", autstic:"autistic", austistic:"autistic",
  develpmental:"developmental", developemental:"developmental", devlopmental:"developmental",
  waitlsit:"waitlist", wailist:"waitlist", waitliist:"waitlist", waitlits:"waitlist",
  whaitlist:"waitlist", shortgage:"shortage", shoratge:"shortage", demmand:"demand",
  rbts:"rbt", rbtss:"rbt", rbtz:"rbt", rbtt:"rbt", rtb:"rbt", rbtsn:"rbt",
  bcabs:"bcba", bcbas:"bcba", bcbba:"bcba", bcbaas:"bcba", bcab:"bcba", bcca:"bcba",
  hireing:"hiring", recruting:"recruiting", recriut:"recruit", recurit:"recruit",
  enrolement:"enrollment", enrolllment:"enrollment", enrolment:"enrollment",
  covergae:"coverage", coverge:"coverage", availablity:"availability", avalability:"availability",
  insurence:"insurance", insuracne:"insurance", medicade:"medicaid", medicad:"medicaid",
  reimbursemet:"reimbursement", reimbrusement:"reimbursement",
  regualtions:"regulations", licencing:"licensing", liscensing:"licensing",
  resarch:"research", reserch:"research", resreach:"research",
  verfy:"verify", verfiy:"verify", verfication:"verification", crossreferance:"cross reference",
  crossreferrence:"cross reference", evidance:"evidence", evdience:"evidence",
  canas:"census", cencus:"census", deomgraphics:"demographics", demogrpahics:"demographics",
  misconstrued:"misconstrued",
};

const FUZZY_TARGETS = [
  "referral","referrals","pediatric","pediatrician","preschool","daycare","childcare",
  "occupational","developmental","psychologist","speech","autism","autistic","behavior",
  "therapy","technician","registered","analyst","waitlist","shortage","hiring",
  "staffing","insurance","medicaid","demographics","evidence","research",
  "corroborate","sources","enrollment","families","clients","recruiting",
];

const NOT_PARTNERS = /\b(?:no|not|without|dont|do not|don't|never|instead of)\b.{0,45}\b(?:partners?|partnerships?|partnering)\b/i;
const PARTNERS = /\b(?:partner(?:s|ships|ing)?|collaborat(?:e|ion|ions)|affiliate(?:s|d)?)\b/i;
const explicitFamily = /\b(?:clients?|famil(?:y|ies)|patients?|intakes?|enrollments?|caseload|children|kids|new referrals)\b/i;

function normalized(value: string) {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[–—−]/g, "-")
    .replace(/([0-9])\s*-\s*([0-9])/g, "$1 to $2")
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ").replace(/\s+/g, " ").trim();
}
function hasPhrase(haystack: string, needle: string) {
  return (" " + haystack + " ").includes(" " + needle + " ");
}
function editDistanceAtMostOne(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let left = 0, right = 0, errors = 0;
  while (left < a.length && right < b.length) {
    if (a[left] === b[right]) { left++; right++; continue; }
    if (++errors > 1) return false;
    if (a.length > b.length) left++;
    else if (a.length < b.length) right++;
    else { left++; right++; }
  }
  return errors + Number(left < a.length || right < b.length) <= 1;
}

export interface AbaLanguageReading {
  original: string;
  normalized: string;
  corrected: string;
  interpretedGoal: "client_acquisition" | "rbt_recruiting" | "bcba_recruiting" | "public_market_research";
  mode: AbaResearchEngine | null;
  recognized: Array<{ id: string; kind: AbaLanguageKind; canonical: string }>;
  corrections: Array<{ from: string; to: string }>;
  warnings: string[];
  suggestedQueries: string[];
  lexiconAliases: number;
}

export function understandAbaRequest(input: string, engine?: AbaResearchEngine): AbaLanguageReading {
  const original = input.slice(0, 1000);
  const cleaned = normalized(original);
  const tokens = cleaned.split(" ");
  const corrections: Array<{ from: string; to: string }> = [];
  const protectedWords = new Set(
    [...original.matchAll(/["“”]([^"“”]{1,100})["“”]/g)]
      .flatMap((match) => normalized(match[1]).split(" ")),
  );
  const hasDomainContext = /\b(?:aba|autis\w*|rbt\w*|bcba\w*|clinic|therap\w*|pediatr\w*|refer\w*|child|famil\w*|staff\w*|hiring)\b/.test(cleaned);
  const correctedTokens = tokens.map((token) => {
    if (!token || /\d/.test(token) || protectedWords.has(token)) return token;
    const literal = ABA_COMMON_MISSPELLINGS[token];
    let replacement = literal;
    // Fuzzy matching is intentionally limited to unambiguous single-edit ABA terms.
    if (!replacement && hasDomainContext && token.length >= 6 && !FUZZY_TARGETS.includes(token)) {
      const near = FUZZY_TARGETS.filter((candidate) => editDistanceAtMostOne(token, candidate));
      if (near.length === 1) replacement = near[0];
    }
    if (replacement && replacement !== token) corrections.push({ from: token, to: replacement });
    return replacement ?? token;
  });
  const corrected = correctedTokens.join(" ").replace(/\s+/g, " ").trim();
  const recognized = ABA_LEXICON.filter((item) =>
    [item.canonical, ...item.variants].some((phrase) =>
      hasPhrase(corrected, normalized(phrase)) || hasPhrase(cleaned, normalized(phrase)),
    ),
  ).map(({ id, kind, canonical }) => ({ id, kind, canonical }));
  const kinds = new Set(recognized.map((term) => term.kind));
  const explicitPartners = PARTNERS.test(cleaned) && !NOT_PARTNERS.test(original);
  const warnings: string[] = [];
  if (explicitPartners && !explicitFamily.test(cleaned) && engine === "client") {
    warnings.push("Client mode researches access to ABA services and consenting family inquiries; it does not treat ABA agency partnerships as client leads.");
  }
  if (kinds.has("staffing") && kinds.has("client") && engine === "client") {
    warnings.push("Staffing and client access were mentioned together. Client access remains the selected goal; staffing is supporting context.");
  }
  if (NOT_PARTNERS.test(original)) {
    warnings.push("ABA agency partnership outreach is excluded from the requested goal.");
  }
  const mode = engine ?? null;
  const interpretedGoal = mode === "rbt" ? "rbt_recruiting" :
    mode === "bcba" ? "bcba_recruiting" :
    mode === "client" || kinds.has("client") || kinds.has("referral") ? "client_acquisition" :
    kinds.has("staffing") ? "rbt_recruiting" : "public_market_research";
  const suggestions: string[] = [];
  if (interpretedGoal === "client_acquisition") {
    if (kinds.has("referral")) suggestions.push("pediatric child development ABA service referral pathways");
    if (kinds.has("community")) suggestions.push("ABA therapy waitlist children service availability");
    if (kinds.has("market")) suggestions.push("ABA therapy access underserved children local provider capacity");
    if (kinds.has("evidence")) suggestions.push("official child services county program public reports");
  } else if (interpretedGoal === "rbt_recruiting") {
    suggestions.push("registered behavior technician RBT jobs and training");
    if (kinds.has("market")) suggestions.push("RBT staffing demand regional ABA employers");
  } else if (interpretedGoal === "bcba_recruiting") {
    suggestions.push("BCBA licensed behavior analyst hiring and supervision");
  }
  return {
    original, normalized: cleaned, corrected, interpretedGoal, mode, recognized,
    corrections: [...new Map(corrections.map((item) => [item.from, item])).values()].slice(0, 12),
    warnings: [...new Set(warnings)],
    suggestedQueries: suggestions.slice(0, 3),
    lexiconAliases: ABA_LEXICON.reduce((sum, item) => sum + item.variants.length, 0),
  };
}
