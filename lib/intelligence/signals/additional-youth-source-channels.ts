import type { PublicSourceChannel } from "./source-channel-catalog";

/**
 * Public discovery candidate pages, not live authenticated integrations.
 * Two aggregate-only publishers disallow commercial reuse of underlying directory data.
 * Never convert directory records about families or children into leads.
 * A candidate is counted as observed only after a real URL is returned by public search.
 */
export const ADDITIONAL_YOUTH_SOURCE_CHANNELS: readonly PublicSourceChannel[] = [
  {
    "host": "koec.ks.gov",
    "scope": "KS",
    "kind": "program",
    "method": "site-search",
    "focus": "Kansas Office of Early Childhood child care licensing developmental services",
    "access": "public-index"
  },
  {
    "host": "kschildrenscabinet.gov",
    "scope": "KS",
    "kind": "program",
    "method": "site-search",
    "focus": "Kansas Children's Cabinet county child care service capacity",
    "access": "public-index"
  },
  {
    "host": "1800childrenks.org",
    "scope": "KS",
    "kind": "referral",
    "method": "site-search",
    "focus": "Kansas public family service resource directory",
    "access": "public-index"
  },
  {
    "host": "ks.childcareaware.org",
    "scope": "KS",
    "kind": "demographic",
    "method": "site-search",
    "focus": "Kansas county child care capacity supply demand reports",
    "access": "aggregate-only"
  },
  {
    "host": "allinforkansaskids.org",
    "scope": "KS",
    "kind": "program",
    "method": "site-search",
    "focus": "Kansas early childhood needs assessment rural service gaps",
    "access": "public-index"
  },
  {
    "host": "familyresources.mo.gov",
    "scope": "MO",
    "kind": "referral",
    "method": "site-search",
    "focus": "Missouri public family resource services by county",
    "access": "public-index"
  },
  {
    "host": "extension.missouri.edu",
    "scope": "MO",
    "kind": "research",
    "method": "site-search",
    "focus": "Missouri county child care capacity early childhood reports",
    "access": "public-index"
  },
  {
    "host": "healthapps.dhss.mo.gov",
    "scope": "MO",
    "kind": "license",
    "method": "site-search",
    "focus": "Missouri licensed child care public facility listings",
    "access": "public-index"
  },
  {
    "host": "mhanet.com",
    "scope": "MO",
    "kind": "research",
    "method": "site-search",
    "focus": "Missouri hospital community health needs assessments",
    "access": "aggregate-only"
  },
  {
    "host": "211colorado.org",
    "scope": "CO",
    "kind": "program",
    "method": "site-search",
    "focus": "Colorado early childhood councils and resource navigation",
    "access": "public-index"
  },
  {
    "host": "datacenter.aecf.org",
    "scope": "national",
    "kind": "demographic",
    "method": "site-search",
    "focus": "KIDS COUNT county youth population education wellbeing",
    "access": "public-index"
  },
  {
    "host": "childhealthdata.org",
    "scope": "national",
    "kind": "research",
    "method": "site-search",
    "focus": "National Survey of Children's Health state youth healthcare access",
    "access": "public-index"
  },
  {
    "host": "nschdata.org",
    "scope": "national",
    "kind": "research",
    "method": "site-search",
    "focus": "NSCH interactive state child health services access",
    "access": "public-index"
  },
  {
    "host": "ruralhealthinfo.org",
    "scope": "national",
    "kind": "research",
    "method": "site-search",
    "focus": "rural health pediatric service access and regional resources",
    "access": "public-index"
  },
  {
    "host": "reachoutandread.org",
    "scope": "national",
    "kind": "referral",
    "method": "site-search",
    "focus": "pediatric practices child development resources program",
    "access": "public-index"
  },
  {
    "host": "childcareaware.org",
    "scope": "national",
    "kind": "demographic",
    "method": "site-search",
    "focus": "child care supply availability state 2026 price reports",
    "access": "public-index"
  },
  {
    "host": "eddataexpress.ed.gov",
    "scope": "federal",
    "kind": "education",
    "method": "site-search",
    "focus": "IDEA special education child population state data",
    "access": "public-index"
  },
  {
    "host": "mchb.hrsa.gov",
    "scope": "federal",
    "kind": "research",
    "method": "site-search",
    "focus": "maternal child health special needs child services state",
    "access": "public-index"
  },
  {
    "host": "ecclacolorado.org",
    "scope": "CO",
    "kind": "referral",
    "method": "site-search",
    "focus": "Colorado county early childhood council directory and referral support resources",
    "access": "public-index"
  },
  {
    "host": "dataqualitycampaign.org",
    "scope": "national",
    "kind": "research",
    "method": "site-search",
    "focus": "early childhood state and county education data quality",
    "access": "public-index"
  }
];
