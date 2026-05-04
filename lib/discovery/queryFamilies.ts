import type { QueryFamily, SearchQuery } from "@/lib/domain/types";

export const queryFamilies: QueryFamily[] = [
  {
    id: "daycare-preschool",
    label: "Daycare / Preschool",
    intent: "Find early-childhood organizations that may hear from parents about behavior, autism, speech, and developmental concerns.",
    templates: [
      "daycare [location]",
      "preschool [location]",
      "private preschool [location]",
      "child care center [location]",
      "special needs preschool [location]",
      "inclusive preschool [location]",
      "early childhood center [location]",
    ],
  },
  {
    id: "pediatric",
    label: "Pediatric Offices",
    intent: "Find pediatric medical practices that may diagnose, screen, or refer families seeking ABA support.",
    templates: [
      "pediatrician [location]",
      "pediatric clinic [location]",
      "children's doctor [location]",
      "pediatric practice [location]",
      "developmental screening pediatrician [location]",
    ],
  },
  {
    id: "speech-ot",
    label: "Speech / OT Clinics",
    intent: "Find complementary therapy providers likely to see children with autism, speech delay, sensory needs, and behavior concerns.",
    templates: [
      "pediatric speech therapy [location]",
      "children speech delay therapy [location]",
      "speech language pathologist children [location]",
      "pediatric occupational therapy [location]",
      "sensory processing occupational therapy [location]",
      "children OT clinic [location]",
    ],
  },
  {
    id: "developmental-autism-evaluation",
    label: "Developmental / Autism Evaluation",
    intent: "Find diagnostic and evaluation sources that may refer families after autism or developmental-delay concerns.",
    templates: [
      "developmental pediatrician [location]",
      "autism evaluation children [location]",
      "autism testing children [location]",
      "child psychologist autism testing [location]",
      "pediatric neurologist autism [location]",
      "ASD evaluation children [location]",
    ],
  },
  {
    id: "early-intervention",
    label: "Early Intervention",
    intent: "Find early intervention and child development resources where developmental delays are discussed.",
    templates: [
      "early intervention provider [location]",
      "developmental delay services children [location]",
      "birth to three services [location]",
      "child development center [location]",
    ],
  },
  {
    id: "community-parent",
    label: "Community / Parent Resources",
    intent: "Find parent-facing groups, nonprofits, resource centers, and family support sources.",
    templates: [
      "family resource center [location]",
      "autism parent group [location]",
      "special needs parent group [location]",
      "autism resources [location]",
      "developmental disability resources children [location]",
    ],
  },
  {
    id: "demand-signal",
    label: "Demand Signals",
    intent: "Find public signals that suggest unmet need, waitlists, shortages, or parent demand.",
    templates: [
      "ABA services needed [location]",
      "autism services waitlist [location]",
      "autism services shortage [location]",
      "developmental delay services [location]",
      "families seeking autism services [location]",
      "special education autism [location]",
      "Child Find autism [location]",
      "early intervention autism [location]",
      "autism resource fair [location]",
      "special needs parent resources [location]",
      "Medicaid autism services [location]",
      "speech delay services [location]",
      "behavioral concerns preschool [location]",
    ],
  },
  {
    id: "board-minutes",
    label: "Board / Committee Signals",
    intent: "Find public education-system documents that mention autism, Child Find, IEP, and special-education pressure.",
    templates: [
      "school board minutes autism [location]",
      "special education advisory committee [location]",
      "parent advisory council special education [location]",
      "preschool committee special needs [location]",
      "board minutes special education autism [location]",
      "district child find developmental delay [location]",
      "special education services shortage [location]",
      "IEP autism preschool [location]",
    ],
  },
  {
    id: "job-posting-signals",
    label: "Job-Posting Market Signals",
    intent: "Find hiring signals that suggest local ABA or pediatric therapy demand.",
    templates: [
      "hiring behavior technician [location]",
      "hiring RBT [location]",
      "hiring BCBA [location]",
      "hiring autism support [location]",
      "hiring special education aide [location]",
      "hiring child development specialist [location]",
      "hiring pediatric speech therapist [location]",
      "hiring pediatric occupational therapist [location]",
    ],
  },
];

export function generateQueries(location: string, selectedFamily = "all", limitPerFamily = 3): SearchQuery[] {
  const cleanLocation = location.trim();
  if (!cleanLocation) return [];

  const families = selectedFamily === "all" ? queryFamilies : queryFamilies.filter((family) => family.id === selectedFamily);

  return families.flatMap((family) =>
    family.templates.slice(0, limitPerFamily).map((template, index) => ({
      id: `${family.id}-${index}`,
      family: family.id,
      query: template.replace("[location]", cleanLocation),
      location: cleanLocation,
      sourceType: family.label,
    })),
  );
}

export function generateContactQueries(organizationName: string): SearchQuery[] {
  const roles = [
    "director",
    "owner",
    "administrator",
    "office manager",
    "referral coordinator",
    "care coordinator",
    "clinical director",
    "program director",
    "family services coordinator",
    "principal",
    "special education coordinator",
  ];

  return roles.map((role, index) => ({
    id: `contact-${index}`,
    family: "contact-discovery",
    query: `"${organizationName}" ${role}`,
    location: "",
    sourceType: "Contact Discovery",
  }));
}
