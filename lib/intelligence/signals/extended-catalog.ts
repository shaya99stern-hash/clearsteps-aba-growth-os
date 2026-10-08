import type { IndicatorPillar } from "../phase3/indicator-catalog";

/** 60 independent hypotheses, not 60 automatic assertions of need. */
export const EXTRA_SIGNAL_PILLARS: readonly IndicatorPillar[] = [
  {
    "id": "service-capacity",
    "title": "Service availability and bottlenecks",
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
      "client": 8,
      "rbt": 3,
      "bcba": 3
    },
    "indicators": [
      "ABA intake waitlist announcements",
      "ABA temporary intake closures",
      "ABA reopening intake",
      "New ABA therapy clinic announced",
      "Existing ABA clinic closure announced",
      "Public appointment lead times",
      "Published service capacity expansion",
      "Rural outreach clinic schedule",
      "Parent training program availability",
      "After school therapy slots"
    ]
  },
  {
    "id": "institutional-demand",
    "title": "Institutional/public-program context",
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
      "client": 7,
      "rbt": 1,
      "bcba": 1
    },
    "indicators": [
      "Regional early intervention program growth",
      "Child Find referral initiative",
      "Public school inclusion program expansion",
      "Special education personnel vacancy",
      "Special education district funding award",
      "Disability services program grant award",
      "Autism services agency contract opportunity",
      "County-wide developmental screening event",
      "Public pediatric specialty expansion",
      "Public early childhood service shortage"
    ]
  },
  {
    "id": "community-context",
    "title": "Aggregate public community context",
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
      "client": 3,
      "rbt": 1,
      "bcba": 1
    },
    "indicators": [
      "Public local forum about service availability",
      "Aggregated multi-thread waiting list themes",
      "Public autism advocacy event announced",
      "Municipal autism awareness traffic safety campaign",
      "Public library autism resource event",
      "Local newspaper developmental services coverage",
      "Nonprofit support-group program announcement",
      "County autism resource fair",
      "Public town hall accessibility agenda",
      "Community sensory accessibility program"
    ]
  },
  {
    "id": "referral-pathways",
    "title": "Public referral pathways",
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
      "client": 7,
      "rbt": 1,
      "bcba": 1
    },
    "indicators": [
      "Hospital pediatric referral partnership",
      "Speech therapy referral pathway",
      "Occupational therapy referral program",
      "Public preschool developmental referral information",
      "Licensed daycare inclusion program",
      "Early intervention local contact network",
      "Regional family resource agency directory",
      "School district Child Find outreach",
      "Public autism evaluation clinic referral path",
      "Nonprofit developmental support referral service"
    ]
  },
  {
    "id": "workforce-friction",
    "title": "Workforce pressure and training",
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
      "client": 3,
      "rbt": 12,
      "bcba": 12
    },
    "indicators": [
      "RBT job advertisement growth",
      "BCBA job advertisement growth",
      "Advertised technician pay increase",
      "Advertised analyst salary increase",
      "Published clinician vacancy duration",
      "Public behavior tech training cohort",
      "University behavior analysis graduate program",
      "Public technician apprenticeship",
      "BCBA clinical director role opening",
      "Employer RBT sign-on bonus"
    ]
  },
  {
    "id": "market-validation",
    "title": "Independent opportunity verification",
    "engines": [
      "client",
      "rbt",
      "bcba"
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
      "ABA provider directory changed",
      "Insurance ABA network expansion",
      "Medicaid provider notice affecting ABA",
      "Clinic commercial payer contracting announcement",
      "Provider geographic service-area change",
      "Public construction or lease of ABA clinic",
      "County public health needs assessment",
      "Regional transportation access barrier",
      "Official licensing or inspection change",
      "Time-separated independent reporting of service gap"
    ]
  }
];

export interface PublicSignalRule {
  id: string;
  name: string;
  group: string;
  keywords: readonly string[];
  community: boolean;
  /** Institutional program age interval, never an individual patient attribute. */
  ageRange?: readonly [number, number];
  requiresAgeAlignment?: boolean;
}
export const PUBLIC_SIGNAL_RULES: readonly PublicSignalRule[] = [
  {
    "id": "service-capacity.01",
    "name": "ABA intake waitlist announcements",
    "keywords": [
      "aba",
      "waitlist"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.02",
    "name": "ABA temporary intake closures",
    "keywords": [
      "aba",
      "not accepting"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.03",
    "name": "ABA reopening intake",
    "keywords": [
      "aba",
      "accepting new"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.04",
    "name": "New ABA therapy clinic announced",
    "keywords": [
      "aba",
      "opening"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.05",
    "name": "Existing ABA clinic closure announced",
    "keywords": [
      "aba",
      "closing"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.06",
    "name": "Public appointment lead times",
    "keywords": [
      "appointment",
      "wait"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.07",
    "name": "Published service capacity expansion",
    "keywords": [
      "aba",
      "capacity"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.08",
    "name": "Rural outreach clinic schedule",
    "keywords": [
      "mobile clinic",
      "therapy"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.09",
    "name": "Parent training program availability",
    "keywords": [
      "parent training",
      "available"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "service-capacity.10",
    "name": "After school therapy slots",
    "keywords": [
      "after school",
      "therapy"
    ],
    "group": "service-capacity",
    "community": false
  },
  {
    "id": "institutional-demand.01",
    "name": "Regional early intervention program growth",
    "keywords": [
      "early intervention",
      "expand"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.02",
    "name": "Child Find referral initiative",
    "keywords": [
      "child find",
      "referral"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.03",
    "name": "Public school inclusion program expansion",
    "keywords": [
      "inclusive classroom",
      "expand"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.04",
    "name": "Special education personnel vacancy",
    "keywords": [
      "special education",
      "vacanc"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.05",
    "name": "Special education district funding award",
    "keywords": [
      "special education",
      "grant"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.06",
    "name": "Disability services program grant award",
    "keywords": [
      "disability services",
      "grant"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.07",
    "name": "Autism services agency contract opportunity",
    "keywords": [
      "autism",
      "contract"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.08",
    "name": "County-wide developmental screening event",
    "keywords": [
      "developmental screening",
      "event"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.09",
    "name": "Public pediatric specialty expansion",
    "keywords": [
      "pediatric",
      "expand"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "institutional-demand.10",
    "name": "Public early childhood service shortage",
    "keywords": [
      "early childhood",
      "shortage"
    ],
    "group": "institutional-demand",
    "community": false
  },
  {
    "id": "community-context.01",
    "name": "Public local forum about service availability",
    "keywords": [
      "services",
      "availability"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.02",
    "name": "Aggregated multi-thread waiting list themes",
    "keywords": [
      "waitlist",
      "therapy"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.03",
    "name": "Public autism advocacy event announced",
    "keywords": [
      "autism awareness",
      "event"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.04",
    "name": "Municipal autism awareness traffic safety campaign",
    "keywords": [
      "autism",
      "traffic safety"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.05",
    "name": "Public library autism resource event",
    "keywords": [
      "library",
      "autism"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.06",
    "name": "Local newspaper developmental services coverage",
    "keywords": [
      "local",
      "autism services"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.07",
    "name": "Nonprofit support-group program announcement",
    "keywords": [
      "support group",
      "program"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.08",
    "name": "County autism resource fair",
    "keywords": [
      "autism",
      "resource fair"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.09",
    "name": "Public town hall accessibility agenda",
    "keywords": [
      "accessibility",
      "town hall"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "community-context.10",
    "name": "Community sensory accessibility program",
    "keywords": [
      "sensory friendly",
      "program"
    ],
    "group": "community-context",
    "community": true
  },
  {
    "id": "referral-pathways.01",
    "name": "Hospital pediatric referral partnership",
    "keywords": [
      "hospital",
      "referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.02",
    "name": "Speech therapy referral pathway",
    "keywords": [
      "speech therapy",
      "referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.03",
    "name": "Occupational therapy referral program",
    "keywords": [
      "occupational therapy",
      "referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.04",
    "name": "Public preschool developmental referral information",
    "keywords": [
      "preschool",
      "developmental referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.05",
    "name": "Licensed daycare inclusion program",
    "keywords": [
      "daycare",
      "inclusion"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.06",
    "name": "Early intervention local contact network",
    "keywords": [
      "early intervention",
      "contact"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.07",
    "name": "Regional family resource agency directory",
    "keywords": [
      "family resource",
      "directory"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.08",
    "name": "School district Child Find outreach",
    "keywords": [
      "child find",
      "outreach"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.09",
    "name": "Public autism evaluation clinic referral path",
    "keywords": [
      "autism evaluation",
      "referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "referral-pathways.10",
    "name": "Nonprofit developmental support referral service",
    "keywords": [
      "developmental support",
      "referral"
    ],
    "group": "referral-pathways",
    "community": false
  },
  {
    "id": "workforce-friction.01",
    "name": "RBT job advertisement growth",
    "keywords": [
      "rbt",
      "hiring"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.02",
    "name": "BCBA job advertisement growth",
    "keywords": [
      "bcba",
      "hiring"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.03",
    "name": "Advertised technician pay increase",
    "keywords": [
      "technician",
      "pay"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.04",
    "name": "Advertised analyst salary increase",
    "keywords": [
      "behavior analyst",
      "salary"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.05",
    "name": "Published clinician vacancy duration",
    "keywords": [
      "clinician",
      "unfilled"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.06",
    "name": "Public behavior tech training cohort",
    "keywords": [
      "rbt",
      "training"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.07",
    "name": "University behavior analysis graduate program",
    "keywords": [
      "behavior analysis",
      "graduate"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.08",
    "name": "Public technician apprenticeship",
    "keywords": [
      "behavior technician",
      "apprentice"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.09",
    "name": "BCBA clinical director role opening",
    "keywords": [
      "clinical director",
      "bcba"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "workforce-friction.10",
    "name": "Employer RBT sign-on bonus",
    "keywords": [
      "rbt",
      "sign-on"
    ],
    "group": "workforce-friction",
    "community": false
  },
  {
    "id": "market-validation.01",
    "name": "ABA provider directory changed",
    "keywords": [
      "aba",
      "provider directory"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.02",
    "name": "Insurance ABA network expansion",
    "keywords": [
      "aba",
      "network expansion"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.03",
    "name": "Medicaid provider notice affecting ABA",
    "keywords": [
      "medicaid",
      "aba notice"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.04",
    "name": "Clinic commercial payer contracting announcement",
    "keywords": [
      "aba",
      "contracting"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.05",
    "name": "Provider geographic service-area change",
    "keywords": [
      "aba",
      "service area"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.06",
    "name": "Public construction or lease of ABA clinic",
    "keywords": [
      "aba",
      "new clinic"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.07",
    "name": "County public health needs assessment",
    "keywords": [
      "community health",
      "needs assessment"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.08",
    "name": "Regional transportation access barrier",
    "keywords": [
      "rural",
      "transportation barrier"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.09",
    "name": "Official licensing or inspection change",
    "keywords": [
      "aba",
      "license inspection"
    ],
    "group": "market-validation",
    "community": false
  },
  {
    "id": "market-validation.10",
    "name": "Time-separated independent reporting of service gap",
    "keywords": [
      "therapy shortage",
      "report"
    ],
    "group": "market-validation",
    "community": false
  }
];

export interface CrossSourceCheck {
  id: string;
  left: string;
  right: string;
  title: string;
}
/** Twenty different hypotheses tested using independent corroborating sources. */
export const CROSS_SOURCE_CHECKS: readonly CrossSourceCheck[] = [
  {
    "id": "X01",
    "left": "service-capacity.01",
    "right": "institutional-demand.10",
    "title": "Waitlist and public-program shortage"
  },
  {
    "id": "X02",
    "left": "service-capacity.02",
    "right": "market-validation.01",
    "title": "Intake closure and directory change"
  },
  {
    "id": "X03",
    "left": "service-capacity.03",
    "right": "referral-pathways.09",
    "title": "Reopened intake and referral route"
  },
  {
    "id": "X04",
    "left": "service-capacity.04",
    "right": "market-validation.06",
    "title": "Clinic opening and physical expansion"
  },
  {
    "id": "X05",
    "left": "service-capacity.05",
    "right": "market-validation.01",
    "title": "Clinic closure and provider-directory evidence"
  },
  {
    "id": "X06",
    "left": "service-capacity.06",
    "right": "community-context.02",
    "title": "Wait time and independent discussions"
  },
  {
    "id": "X07",
    "left": "service-capacity.07",
    "right": "institutional-demand.06",
    "title": "Capacity growth and grants"
  },
  {
    "id": "X08",
    "left": "service-capacity.08",
    "right": "market-validation.08",
    "title": "Rural outreach and transport limitations"
  },
  {
    "id": "X09",
    "left": "service-capacity.09",
    "right": "referral-pathways.10",
    "title": "Parent training and nonprofit referral"
  },
  {
    "id": "X10",
    "left": "service-capacity.10",
    "right": "referral-pathways.04",
    "title": "School age service and preschool routing"
  },
  {
    "id": "X11",
    "left": "institutional-demand.01",
    "right": "referral-pathways.06",
    "title": "EI program growth and EI agency network"
  },
  {
    "id": "X12",
    "left": "institutional-demand.02",
    "right": "referral-pathways.08",
    "title": "Child Find initiative and outreach"
  },
  {
    "id": "X13",
    "left": "institutional-demand.03",
    "right": "institutional-demand.04",
    "title": "Inclusive programming and staffing"
  },
  {
    "id": "X14",
    "left": "institutional-demand.05",
    "right": "institutional-demand.06",
    "title": "Special education and developmental grants"
  },
  {
    "id": "X15",
    "left": "institutional-demand.07",
    "right": "market-validation.03",
    "title": "Agency opportunity and Medicaid notices"
  },
  {
    "id": "X16",
    "left": "community-context.04",
    "right": "community-context.09",
    "title": "Municipal awareness and accessibility agenda"
  },
  {
    "id": "X17",
    "left": "community-context.06",
    "right": "market-validation.07",
    "title": "Local reporting and published needs assessment"
  },
  {
    "id": "X18",
    "left": "referral-pathways.01",
    "right": "referral-pathways.09",
    "title": "Hospital referral and evaluation availability"
  },
  {
    "id": "X19",
    "left": "workforce-friction.01",
    "right": "workforce-friction.06",
    "title": "Hiring pressure and training supply"
  },
  {
    "id": "X20",
    "left": "workforce-friction.02",
    "right": "workforce-friction.09",
    "title": "Analyst hiring and supervision demand"
  }
];
