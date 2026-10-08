import type { IndicatorPillar } from "../phase3/indicator-catalog";
import type { PublicSignalRule, CrossSourceCheck } from "./extended-catalog";
/** Nuanced age-aligned public institution hypotheses. A declaration is not an observed fact. */
export const AGES_2_TO_18_PILLARS: readonly IndicatorPillar[] = [
  {
    "id": "school-service-access",
    "title": "School-age service access",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Elementary behavioral therapy referral",
      "School social worker service navigation",
      "District youth counseling waitlist",
      "Public special education staffing gap",
      "School psychologist coverage update",
      "District developmental services partnership",
      "Summer extended school-year program expansion",
      "Transition to kindergarten support capacity",
      "District special education parent workshop",
      "Public school-to-clinic referral protocol"
    ]
  },
  {
    "id": "preschool-service-access",
    "title": "Preschool and early-childhood ages 2–5",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Preschool inclusive classroom waitlist",
      "Public preschool screening schedule",
      "Early childhood evaluation appointment",
      "Preschool speech-language service expansion",
      "Head Start disability inclusion announcement",
      "Preschool family resource program",
      "Inclusive toddler preschool ages 2–5",
      "Early childhood mental health consultation",
      "Preschool special education staffing grant",
      "Public pre-K transition meeting schedule"
    ]
  },
  {
    "id": "adolescent-access",
    "title": "Adolescent ages 13–18 support and transition",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Teen autism community program expansion",
      "High school related services availability",
      "School-age adolescent therapy scheduling",
      "School district adolescent support group",
      "Teen respite provider public program",
      "High school behavioral consultation contract",
      "Youth ages 13–18 assessment capacity",
      "Teen after-school skill-building program",
      "Public secondary school neurodiversity initiative",
      "Teen autism resource navigation directory"
    ]
  },
  {
    "id": "evaluation-navigation",
    "title": "Pediatric evaluation and navigation",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "School-age diagnostic clinic openings",
      "Developmental assessment scheduling backlog",
      "Pediatric neuropsychology referral instructions",
      "Autism evaluation referral wait times",
      "Early childhood evaluation scheduling service",
      "Multidisciplinary youth diagnostic team",
      "Regional child development intake form",
      "School district assessment referral form",
      "Pediatric developmental screening event",
      "Hospital pediatric service navigation"
    ]
  },
  {
    "id": "school-board-signals",
    "title": "Public board minutes and budgets",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Special education contract award",
      "Youth behavioral health RFP",
      "School psychologist hiring budget",
      "Extended school-year transport award",
      "Public inclusive classroom capital budget",
      "District preschool enrollment growth briefing",
      "Special education consultant procurement",
      "District Medicaid billing program update",
      "School board child find capacity hearing",
      "Municipal adolescent service grant"
    ]
  },
  {
    "id": "public-health-programs",
    "title": "Public health and children’s programs",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "County child wellness strategic plan",
      "Children's developmental screening coalition",
      "Public health youth disability program",
      "County early childhood resource gap report",
      "Regional pediatric behavior service pilot",
      "Hospital school-age clinic schedule",
      "Published public children's therapy partnership",
      "Youth behavioral health community needs assessment",
      "Children's mental health workforce grant",
      "County child transportation clinic access"
    ]
  },
  {
    "id": "community-organizations",
    "title": "Public organization and advocacy programs",
    "engines": [
      "client"
    ],
    "direction": "confidence",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 0,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Local autism resource fair venue",
      "County sensory-friendly theater program",
      "Municipal inclusive playground programming",
      "Municipal child road-safety awareness campaign",
      "Public library sensory program funding",
      "School PTA developmental resource event",
      "Youth disability sports recreation expansion",
      "Nonprofit school-age respite event",
      "Public neighborhood disability access committee",
      "Accessible after-school community arts schedule"
    ]
  },
  {
    "id": "mobility-access",
    "title": "Public transportation and service accessibility",
    "engines": [
      "client"
    ],
    "direction": "confidence",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 0,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "School-age therapy transport hardship report",
      "Accessible clinic bus route expansion",
      "Paratransit youth appointment schedule",
      "School district extended route shortage",
      "Rural pediatric specialty transport funding",
      "Transit accessible child therapy center",
      "Youth clinic vehicle grant awarded",
      "Public appointment shuttle for preschool",
      "After-school transportation extended coverage",
      "City accessibility advisory pediatric route"
    ]
  },
  {
    "id": "after-school-seasonal",
    "title": "After-school, summer and seasonal programming",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Autism-friendly school-age summer camp",
      "Summer camp additional inclusive slots",
      "After-school developmental services partnership",
      "Teen school-break respite availability",
      "Extended-day speech and OT services",
      "Public youth recreation waitlist",
      "Inclusive after-school staffing increase",
      "Autism-focused community weekend program",
      "Public district break-program expansion",
      "After-school sensory-friendly library series"
    ]
  },
  {
    "id": "clinic-market-movement",
    "title": "Youth-serving facility and network movement",
    "engines": [
      "client"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 3,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Child clinic new location announced",
      "Adolescent outpatient program capacity expanded",
      "School-age therapy program temporarily closed",
      "Pediatric therapy program relaunch announced",
      "Child developmental clinic construction permit",
      "Hospital pediatric behavioral services addition",
      "County ABA provider network pediatric gap",
      "Early childhood therapy lease expansion",
      "School-age clinic service territory changed",
      "Child development center relocates public program"
    ]
  },
  {
    "id": "payer-public-notices",
    "title": "Public payer and regulatory signals",
    "engines": [
      "client"
    ],
    "direction": "confidence",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 0,
      "rbt": 0,
      "bcba": 0
    },
    "indicators": [
      "Child ABA benefit provider bulletin",
      "Pediatric ABA prior authorization update",
      "School-age Medicaid therapy access webinar",
      "Children therapy MCO network contracting",
      "Pediatric therapy billing code update",
      "Official age-limit pediatric ABA coverage",
      "Children behavioral health waiver change",
      "Pediatric in-network directory update",
      "School-based Medicaid behavioral service notice",
      "Public insurer pediatric referral coordination"
    ]
  },
  {
    "id": "pediatric-workforce",
    "title": "Pediatric-focused professional staffing signals",
    "engines": [
      "client",
      "rbt",
      "bcba"
    ],
    "direction": "higher_opportunity",
    "sourceClasses": [
      "state",
      "organization",
      "web",
      "derived"
    ],
    "weights": {
      "client": 1,
      "rbt": 6,
      "bcba": 6
    },
    "indicators": [
      "Pediatric ABA BCBA hiring announcement",
      "Preschool behavior technician hiring",
      "School-age RBT position open",
      "Youth behavior analyst supervising role",
      "Pediatric specialist recruitment grant",
      "Special education teacher staffing crisis",
      "Pediatric outpatient staff training cohort",
      "Child behavior technician apprenticeship",
      "School BCBA contract positions",
      "Teen therapy clinical director opening"
    ]
  }
];
export const AGES_2_TO_18_RULES: readonly PublicSignalRule[] = [
  {
    "id": "school-service-access.01",
    "name": "Elementary behavioral therapy referral",
    "group": "school-service-access",
    "keywords": [
      "elementary school",
      "behavior therapy"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.02",
    "name": "School social worker service navigation",
    "group": "school-service-access",
    "keywords": [
      "school social worker",
      "resources"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.03",
    "name": "District youth counseling waitlist",
    "group": "school-service-access",
    "keywords": [
      "school district",
      "waitlist"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.04",
    "name": "Public special education staffing gap",
    "group": "school-service-access",
    "keywords": [
      "special education",
      "staff shortage"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.05",
    "name": "School psychologist coverage update",
    "group": "school-service-access",
    "keywords": [
      "school psychologist",
      "staffing"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.06",
    "name": "District developmental services partnership",
    "group": "school-service-access",
    "keywords": [
      "district",
      "developmental services"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.07",
    "name": "Summer extended school-year program expansion",
    "group": "school-service-access",
    "keywords": [
      "extended school year",
      "expand"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.08",
    "name": "Transition to kindergarten support capacity",
    "group": "school-service-access",
    "keywords": [
      "kindergarten",
      "support program"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.09",
    "name": "District special education parent workshop",
    "group": "school-service-access",
    "keywords": [
      "special education",
      "workshop"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-service-access.10",
    "name": "Public school-to-clinic referral protocol",
    "group": "school-service-access",
    "keywords": [
      "school",
      "clinic referral"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.01",
    "name": "Preschool inclusive classroom waitlist",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "inclusion waitlist"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.02",
    "name": "Public preschool screening schedule",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "developmental screening"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.03",
    "name": "Early childhood evaluation appointment",
    "group": "preschool-service-access",
    "keywords": [
      "early childhood",
      "evaluation appointment"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.04",
    "name": "Preschool speech-language service expansion",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "speech therapy"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.05",
    "name": "Head Start disability inclusion announcement",
    "group": "preschool-service-access",
    "keywords": [
      "head start",
      "disability inclusion"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.06",
    "name": "Preschool family resource program",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "family resource"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.07",
    "name": "Inclusive toddler preschool ages 2–5",
    "group": "preschool-service-access",
    "keywords": [
      "ages 2-5",
      "inclusive preschool"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.08",
    "name": "Early childhood mental health consultation",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "mental health consultation"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.09",
    "name": "Preschool special education staffing grant",
    "group": "preschool-service-access",
    "keywords": [
      "preschool",
      "special education grant"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "preschool-service-access.10",
    "name": "Public pre-K transition meeting schedule",
    "group": "preschool-service-access",
    "keywords": [
      "pre-k",
      "transition meeting"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.01",
    "name": "Teen autism community program expansion",
    "group": "adolescent-access",
    "keywords": [
      "teen",
      "autism program"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.02",
    "name": "High school related services availability",
    "group": "adolescent-access",
    "keywords": [
      "high school",
      "related services"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.03",
    "name": "School-age adolescent therapy scheduling",
    "group": "adolescent-access",
    "keywords": [
      "adolescent",
      "therapy appointments"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.04",
    "name": "School district adolescent support group",
    "group": "adolescent-access",
    "keywords": [
      "school district",
      "teen support group"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.05",
    "name": "Teen respite provider public program",
    "group": "adolescent-access",
    "keywords": [
      "teen",
      "respite program"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.06",
    "name": "High school behavioral consultation contract",
    "group": "adolescent-access",
    "keywords": [
      "high school",
      "behavioral consultation"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.07",
    "name": "Youth ages 13–18 assessment capacity",
    "group": "adolescent-access",
    "keywords": [
      "ages 13-18",
      "assessment"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.08",
    "name": "Teen after-school skill-building program",
    "group": "adolescent-access",
    "keywords": [
      "teen",
      "after school skills"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.09",
    "name": "Public secondary school neurodiversity initiative",
    "group": "adolescent-access",
    "keywords": [
      "high school",
      "neurodiversity"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "adolescent-access.10",
    "name": "Teen autism resource navigation directory",
    "group": "adolescent-access",
    "keywords": [
      "teen",
      "autism resources"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.01",
    "name": "School-age diagnostic clinic openings",
    "group": "evaluation-navigation",
    "keywords": [
      "school age",
      "diagnostic clinic"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.02",
    "name": "Developmental assessment scheduling backlog",
    "group": "evaluation-navigation",
    "keywords": [
      "developmental assessment",
      "waitlist"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.03",
    "name": "Pediatric neuropsychology referral instructions",
    "group": "evaluation-navigation",
    "keywords": [
      "pediatric neuropsychology",
      "referral"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.04",
    "name": "Autism evaluation referral wait times",
    "group": "evaluation-navigation",
    "keywords": [
      "autism evaluation",
      "wait time"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.05",
    "name": "Early childhood evaluation scheduling service",
    "group": "evaluation-navigation",
    "keywords": [
      "preschool",
      "evaluation center"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.06",
    "name": "Multidisciplinary youth diagnostic team",
    "group": "evaluation-navigation",
    "keywords": [
      "youth",
      "multidisciplinary evaluation"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.07",
    "name": "Regional child development intake form",
    "group": "evaluation-navigation",
    "keywords": [
      "child development",
      "intake form"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.08",
    "name": "School district assessment referral form",
    "group": "evaluation-navigation",
    "keywords": [
      "school district",
      "assessment referral"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.09",
    "name": "Pediatric developmental screening event",
    "group": "evaluation-navigation",
    "keywords": [
      "pediatric",
      "screening event"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "evaluation-navigation.10",
    "name": "Hospital pediatric service navigation",
    "group": "evaluation-navigation",
    "keywords": [
      "children hospital",
      "referral navigation"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.01",
    "name": "Special education contract award",
    "group": "school-board-signals",
    "keywords": [
      "school board",
      "special education contract"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.02",
    "name": "Youth behavioral health RFP",
    "group": "school-board-signals",
    "keywords": [
      "school district",
      "behavioral health rfp"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.03",
    "name": "School psychologist hiring budget",
    "group": "school-board-signals",
    "keywords": [
      "school board",
      "school psychologist budget"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.04",
    "name": "Extended school-year transport award",
    "group": "school-board-signals",
    "keywords": [
      "extended school year",
      "transport contract"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.05",
    "name": "Public inclusive classroom capital budget",
    "group": "school-board-signals",
    "keywords": [
      "school board",
      "inclusive classroom"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.06",
    "name": "District preschool enrollment growth briefing",
    "group": "school-board-signals",
    "keywords": [
      "school board",
      "preschool enrollment"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.07",
    "name": "Special education consultant procurement",
    "group": "school-board-signals",
    "keywords": [
      "special education",
      "consultant procurement"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.08",
    "name": "District Medicaid billing program update",
    "group": "school-board-signals",
    "keywords": [
      "school district",
      "medicaid services"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.09",
    "name": "School board child find capacity hearing",
    "group": "school-board-signals",
    "keywords": [
      "school board",
      "child find"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "school-board-signals.10",
    "name": "Municipal adolescent service grant",
    "group": "school-board-signals",
    "keywords": [
      "city council",
      "teen services grant"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.01",
    "name": "County child wellness strategic plan",
    "group": "public-health-programs",
    "keywords": [
      "county health",
      "child wellness"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.02",
    "name": "Children's developmental screening coalition",
    "group": "public-health-programs",
    "keywords": [
      "child development",
      "coalition"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.03",
    "name": "Public health youth disability program",
    "group": "public-health-programs",
    "keywords": [
      "public health",
      "youth disability"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.04",
    "name": "County early childhood resource gap report",
    "group": "public-health-programs",
    "keywords": [
      "county",
      "early childhood resource gap"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.05",
    "name": "Regional pediatric behavior service pilot",
    "group": "public-health-programs",
    "keywords": [
      "pediatric",
      "behavior services pilot"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.06",
    "name": "Hospital school-age clinic schedule",
    "group": "public-health-programs",
    "keywords": [
      "hospital",
      "school age clinic"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.07",
    "name": "Published public children's therapy partnership",
    "group": "public-health-programs",
    "keywords": [
      "children",
      "therapy partnership"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.08",
    "name": "Youth behavioral health community needs assessment",
    "group": "public-health-programs",
    "keywords": [
      "youth behavioral health",
      "needs assessment"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.09",
    "name": "Children's mental health workforce grant",
    "group": "public-health-programs",
    "keywords": [
      "children mental health",
      "workforce grant"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "public-health-programs.10",
    "name": "County child transportation clinic access",
    "group": "public-health-programs",
    "keywords": [
      "county",
      "child clinic transportation"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.01",
    "name": "Local autism resource fair venue",
    "group": "community-organizations",
    "keywords": [
      "autism resource fair",
      "public library"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.02",
    "name": "County sensory-friendly theater program",
    "group": "community-organizations",
    "keywords": [
      "county",
      "sensory friendly theatre"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.03",
    "name": "Municipal inclusive playground programming",
    "group": "community-organizations",
    "keywords": [
      "city",
      "inclusive playground program"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.04",
    "name": "Municipal child road-safety awareness campaign",
    "group": "community-organizations",
    "keywords": [
      "municipal",
      "autism safety campaign"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.05",
    "name": "Public library sensory program funding",
    "group": "community-organizations",
    "keywords": [
      "library",
      "sensory program grant"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.06",
    "name": "School PTA developmental resource event",
    "group": "community-organizations",
    "keywords": [
      "pta",
      "developmental resources"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.07",
    "name": "Youth disability sports recreation expansion",
    "group": "community-organizations",
    "keywords": [
      "youth",
      "adaptive recreation"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.08",
    "name": "Nonprofit school-age respite event",
    "group": "community-organizations",
    "keywords": [
      "school age",
      "respite nonprofit"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.09",
    "name": "Public neighborhood disability access committee",
    "group": "community-organizations",
    "keywords": [
      "city",
      "disability access committee"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "community-organizations.10",
    "name": "Accessible after-school community arts schedule",
    "group": "community-organizations",
    "keywords": [
      "after school",
      "sensory friendly arts"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.01",
    "name": "School-age therapy transport hardship report",
    "group": "mobility-access",
    "keywords": [
      "school bus",
      "therapy transport shortage"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.02",
    "name": "Accessible clinic bus route expansion",
    "group": "mobility-access",
    "keywords": [
      "pediatric clinic",
      "bus route"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.03",
    "name": "Paratransit youth appointment schedule",
    "group": "mobility-access",
    "keywords": [
      "youth",
      "paratransit appointments"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.04",
    "name": "School district extended route shortage",
    "group": "mobility-access",
    "keywords": [
      "school district",
      "transportation shortage"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.05",
    "name": "Rural pediatric specialty transport funding",
    "group": "mobility-access",
    "keywords": [
      "rural",
      "pediatric transport grant"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.06",
    "name": "Transit accessible child therapy center",
    "group": "mobility-access",
    "keywords": [
      "transit",
      "child therapy center"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.07",
    "name": "Youth clinic vehicle grant awarded",
    "group": "mobility-access",
    "keywords": [
      "youth clinic",
      "transportation grant"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.08",
    "name": "Public appointment shuttle for preschool",
    "group": "mobility-access",
    "keywords": [
      "preschool",
      "shuttle program"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.09",
    "name": "After-school transportation extended coverage",
    "group": "mobility-access",
    "keywords": [
      "after school",
      "late bus"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "mobility-access.10",
    "name": "City accessibility advisory pediatric route",
    "group": "mobility-access",
    "keywords": [
      "city accessibility",
      "pediatric transit"
    ],
    "community": true,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.01",
    "name": "Autism-friendly school-age summer camp",
    "group": "after-school-seasonal",
    "keywords": [
      "school age",
      "autism summer camp"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.02",
    "name": "Summer camp additional inclusive slots",
    "group": "after-school-seasonal",
    "keywords": [
      "summer camp",
      "inclusive enrollment"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.03",
    "name": "After-school developmental services partnership",
    "group": "after-school-seasonal",
    "keywords": [
      "after school",
      "developmental partnership"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.04",
    "name": "Teen school-break respite availability",
    "group": "after-school-seasonal",
    "keywords": [
      "teen",
      "school break respite"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.05",
    "name": "Extended-day speech and OT services",
    "group": "after-school-seasonal",
    "keywords": [
      "after school",
      "speech occupational therapy"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.06",
    "name": "Public youth recreation waitlist",
    "group": "after-school-seasonal",
    "keywords": [
      "youth recreation",
      "waitlist"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.07",
    "name": "Inclusive after-school staffing increase",
    "group": "after-school-seasonal",
    "keywords": [
      "inclusive after school",
      "hiring"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.08",
    "name": "Autism-focused community weekend program",
    "group": "after-school-seasonal",
    "keywords": [
      "autism",
      "weekend youth program"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.09",
    "name": "Public district break-program expansion",
    "group": "after-school-seasonal",
    "keywords": [
      "school district",
      "summer program expand"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "after-school-seasonal.10",
    "name": "After-school sensory-friendly library series",
    "group": "after-school-seasonal",
    "keywords": [
      "after school",
      "sensory library"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.01",
    "name": "Child clinic new location announced",
    "group": "clinic-market-movement",
    "keywords": [
      "child therapy clinic",
      "new location"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.02",
    "name": "Adolescent outpatient program capacity expanded",
    "group": "clinic-market-movement",
    "keywords": [
      "teen outpatient",
      "capacity expanded"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.03",
    "name": "School-age therapy program temporarily closed",
    "group": "clinic-market-movement",
    "keywords": [
      "school age",
      "therapy program closed"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.04",
    "name": "Pediatric therapy program relaunch announced",
    "group": "clinic-market-movement",
    "keywords": [
      "pediatric therapy",
      "reopening"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.05",
    "name": "Child developmental clinic construction permit",
    "group": "clinic-market-movement",
    "keywords": [
      "child clinic",
      "building permit"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.06",
    "name": "Hospital pediatric behavioral services addition",
    "group": "clinic-market-movement",
    "keywords": [
      "hospital",
      "pediatric behavioral services"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.07",
    "name": "County ABA provider network pediatric gap",
    "group": "clinic-market-movement",
    "keywords": [
      "county aba",
      "network gap"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.08",
    "name": "Early childhood therapy lease expansion",
    "group": "clinic-market-movement",
    "keywords": [
      "preschool therapy",
      "new lease"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.09",
    "name": "School-age clinic service territory changed",
    "group": "clinic-market-movement",
    "keywords": [
      "school age clinic",
      "service area changed"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "clinic-market-movement.10",
    "name": "Child development center relocates public program",
    "group": "clinic-market-movement",
    "keywords": [
      "child development center",
      "relocating"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.01",
    "name": "Child ABA benefit provider bulletin",
    "group": "payer-public-notices",
    "keywords": [
      "child ABA",
      "provider bulletin"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.02",
    "name": "Pediatric ABA prior authorization update",
    "group": "payer-public-notices",
    "keywords": [
      "pediatric ABA",
      "prior authorization"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.03",
    "name": "School-age Medicaid therapy access webinar",
    "group": "payer-public-notices",
    "keywords": [
      "school age medicaid",
      "therapy webinar"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.04",
    "name": "Children therapy MCO network contracting",
    "group": "payer-public-notices",
    "keywords": [
      "children therapy",
      "network contracting"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.05",
    "name": "Pediatric therapy billing code update",
    "group": "payer-public-notices",
    "keywords": [
      "pediatric therapy",
      "billing code"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.06",
    "name": "Official age-limit pediatric ABA coverage",
    "group": "payer-public-notices",
    "keywords": [
      "ages 2-18",
      "ABA coverage"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.07",
    "name": "Children behavioral health waiver change",
    "group": "payer-public-notices",
    "keywords": [
      "children behavioral health",
      "waiver"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.08",
    "name": "Pediatric in-network directory update",
    "group": "payer-public-notices",
    "keywords": [
      "pediatric therapy",
      "in network directory"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.09",
    "name": "School-based Medicaid behavioral service notice",
    "group": "payer-public-notices",
    "keywords": [
      "school medicaid",
      "behavioral services"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "payer-public-notices.10",
    "name": "Public insurer pediatric referral coordination",
    "group": "payer-public-notices",
    "keywords": [
      "insurance",
      "pediatric referral coordination"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.01",
    "name": "Pediatric ABA BCBA hiring announcement",
    "group": "pediatric-workforce",
    "keywords": [
      "pediatric ABA",
      "BCBA hiring"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.02",
    "name": "Preschool behavior technician hiring",
    "group": "pediatric-workforce",
    "keywords": [
      "preschool",
      "behavior technician hiring"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.03",
    "name": "School-age RBT position open",
    "group": "pediatric-workforce",
    "keywords": [
      "school age",
      "RBT hiring"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.04",
    "name": "Youth behavior analyst supervising role",
    "group": "pediatric-workforce",
    "keywords": [
      "youth",
      "BCBA supervisor"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.05",
    "name": "Pediatric specialist recruitment grant",
    "group": "pediatric-workforce",
    "keywords": [
      "pediatric specialist",
      "recruitment grant"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.06",
    "name": "Special education teacher staffing crisis",
    "group": "pediatric-workforce",
    "keywords": [
      "special education teacher",
      "staffing shortage"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.07",
    "name": "Pediatric outpatient staff training cohort",
    "group": "pediatric-workforce",
    "keywords": [
      "pediatric outpatient",
      "staff training"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.08",
    "name": "Child behavior technician apprenticeship",
    "group": "pediatric-workforce",
    "keywords": [
      "child behavior",
      "technician apprenticeship"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.09",
    "name": "School BCBA contract positions",
    "group": "pediatric-workforce",
    "keywords": [
      "school",
      "BCBA contracted"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  },
  {
    "id": "pediatric-workforce.10",
    "name": "Teen therapy clinical director opening",
    "group": "pediatric-workforce",
    "keywords": [
      "teen therapy",
      "clinical director"
    ],
    "community": false,
    "ageRange": [
      2,
      18
    ],
    "requiresAgeAlignment": true
  }
];
export const AGES_2_TO_18_CHECKS: readonly CrossSourceCheck[] = [
  {
    "id": "X21",
    "left": "school-service-access.01",
    "right": "preschool-service-access.05",
    "title": "School-age service access with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X22",
    "left": "school-service-access.02",
    "right": "preschool-service-access.06",
    "title": "School-age service access with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X23",
    "left": "school-service-access.03",
    "right": "preschool-service-access.07",
    "title": "School-age service access with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X24",
    "left": "school-service-access.04",
    "right": "preschool-service-access.08",
    "title": "School-age service access with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X25",
    "left": "preschool-service-access.01",
    "right": "adolescent-access.05",
    "title": "Preschool and early-childhood ages 2–5 with Adolescent ages 13–18 support and transition"
  },
  {
    "id": "X26",
    "left": "preschool-service-access.02",
    "right": "adolescent-access.06",
    "title": "Preschool and early-childhood ages 2–5 with Adolescent ages 13–18 support and transition"
  },
  {
    "id": "X27",
    "left": "preschool-service-access.03",
    "right": "adolescent-access.07",
    "title": "Preschool and early-childhood ages 2–5 with Adolescent ages 13–18 support and transition"
  },
  {
    "id": "X28",
    "left": "preschool-service-access.04",
    "right": "adolescent-access.08",
    "title": "Preschool and early-childhood ages 2–5 with Adolescent ages 13–18 support and transition"
  },
  {
    "id": "X29",
    "left": "adolescent-access.01",
    "right": "evaluation-navigation.05",
    "title": "Adolescent ages 13–18 support and transition with Pediatric evaluation and navigation"
  },
  {
    "id": "X30",
    "left": "adolescent-access.02",
    "right": "evaluation-navigation.06",
    "title": "Adolescent ages 13–18 support and transition with Pediatric evaluation and navigation"
  },
  {
    "id": "X31",
    "left": "adolescent-access.03",
    "right": "school-board-signals.07",
    "title": "Adolescent ages 13–18 support and transition with Public board minutes and budgets"
  },
  {
    "id": "X32",
    "left": "adolescent-access.04",
    "right": "school-board-signals.08",
    "title": "Adolescent ages 13–18 support and transition with Public board minutes and budgets"
  },
  {
    "id": "X33",
    "left": "evaluation-navigation.01",
    "right": "public-health-programs.05",
    "title": "Pediatric evaluation and navigation with Public health and children’s programs"
  },
  {
    "id": "X34",
    "left": "evaluation-navigation.02",
    "right": "public-health-programs.06",
    "title": "Pediatric evaluation and navigation with Public health and children’s programs"
  },
  {
    "id": "X35",
    "left": "evaluation-navigation.03",
    "right": "public-health-programs.07",
    "title": "Pediatric evaluation and navigation with Public health and children’s programs"
  },
  {
    "id": "X36",
    "left": "evaluation-navigation.04",
    "right": "public-health-programs.08",
    "title": "Pediatric evaluation and navigation with Public health and children’s programs"
  },
  {
    "id": "X37",
    "left": "school-board-signals.01",
    "right": "community-organizations.05",
    "title": "Public board minutes and budgets with Public organization and advocacy programs"
  },
  {
    "id": "X38",
    "left": "school-board-signals.02",
    "right": "community-organizations.06",
    "title": "Public board minutes and budgets with Public organization and advocacy programs"
  },
  {
    "id": "X39",
    "left": "school-board-signals.03",
    "right": "community-organizations.07",
    "title": "Public board minutes and budgets with Public organization and advocacy programs"
  },
  {
    "id": "X40",
    "left": "school-board-signals.04",
    "right": "community-organizations.08",
    "title": "Public board minutes and budgets with Public organization and advocacy programs"
  },
  {
    "id": "X41",
    "left": "public-health-programs.01",
    "right": "after-school-seasonal.05",
    "title": "Public health and children’s programs with After-school, summer and seasonal programming"
  },
  {
    "id": "X42",
    "left": "public-health-programs.02",
    "right": "after-school-seasonal.06",
    "title": "Public health and children’s programs with After-school, summer and seasonal programming"
  },
  {
    "id": "X43",
    "left": "public-health-programs.03",
    "right": "after-school-seasonal.07",
    "title": "Public health and children’s programs with After-school, summer and seasonal programming"
  },
  {
    "id": "X44",
    "left": "public-health-programs.04",
    "right": "after-school-seasonal.08",
    "title": "Public health and children’s programs with After-school, summer and seasonal programming"
  },
  {
    "id": "X45",
    "left": "community-organizations.01",
    "right": "clinic-market-movement.05",
    "title": "Public organization and advocacy programs with Youth-serving facility and network movement"
  },
  {
    "id": "X46",
    "left": "community-organizations.02",
    "right": "clinic-market-movement.06",
    "title": "Public organization and advocacy programs with Youth-serving facility and network movement"
  },
  {
    "id": "X47",
    "left": "community-organizations.03",
    "right": "clinic-market-movement.07",
    "title": "Public organization and advocacy programs with Youth-serving facility and network movement"
  },
  {
    "id": "X48",
    "left": "community-organizations.04",
    "right": "clinic-market-movement.08",
    "title": "Public organization and advocacy programs with Youth-serving facility and network movement"
  },
  {
    "id": "X49",
    "left": "mobility-access.01",
    "right": "payer-public-notices.05",
    "title": "Public transportation and service accessibility with Public payer and regulatory signals"
  },
  {
    "id": "X50",
    "left": "mobility-access.02",
    "right": "payer-public-notices.06",
    "title": "Public transportation and service accessibility with Public payer and regulatory signals"
  },
  {
    "id": "X51",
    "left": "mobility-access.03",
    "right": "pediatric-workforce.07",
    "title": "Public transportation and service accessibility with Pediatric-focused professional staffing signals"
  },
  {
    "id": "X52",
    "left": "mobility-access.04",
    "right": "pediatric-workforce.08",
    "title": "Public transportation and service accessibility with Pediatric-focused professional staffing signals"
  },
  {
    "id": "X53",
    "left": "after-school-seasonal.01",
    "right": "school-service-access.05",
    "title": "After-school, summer and seasonal programming with School-age service access"
  },
  {
    "id": "X54",
    "left": "after-school-seasonal.02",
    "right": "school-service-access.06",
    "title": "After-school, summer and seasonal programming with School-age service access"
  },
  {
    "id": "X55",
    "left": "after-school-seasonal.03",
    "right": "school-service-access.07",
    "title": "After-school, summer and seasonal programming with School-age service access"
  },
  {
    "id": "X56",
    "left": "after-school-seasonal.04",
    "right": "school-service-access.08",
    "title": "After-school, summer and seasonal programming with School-age service access"
  },
  {
    "id": "X57",
    "left": "clinic-market-movement.01",
    "right": "preschool-service-access.05",
    "title": "Youth-serving facility and network movement with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X58",
    "left": "clinic-market-movement.02",
    "right": "preschool-service-access.06",
    "title": "Youth-serving facility and network movement with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X59",
    "left": "clinic-market-movement.03",
    "right": "preschool-service-access.07",
    "title": "Youth-serving facility and network movement with Preschool and early-childhood ages 2–5"
  },
  {
    "id": "X60",
    "left": "clinic-market-movement.04",
    "right": "preschool-service-access.08",
    "title": "Youth-serving facility and network movement with Preschool and early-childhood ages 2–5"
  }
];
