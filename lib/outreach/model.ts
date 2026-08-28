export const REFERRAL_OUTREACH_STAGES = [
  "Qualified",
  "Contact Ready",
  "Outreach",
  "Engaged",
  "Referral Partner",
  "Referral Received",
] as const;

const REFERRAL_OUTREACH_KINDS = new Set(["organization", "referral", "professional"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ReferralOutreachLead {
  id: string;
  name: string;
  kind: string;
  pipeline: string;
  stage: string;
  emails: string[];
  location?: string;
}

export interface PreparedReferralRecipient {
  entityId: string;
  name: string;
  email: string;
  location?: string;
}

export function normalizeOutreachEmail(value: string) {
  return value.trim().toLowerCase();
}

export function prepareReferralRecipient(
  lead: ReferralOutreachLead,
  suppressedEmails: ReadonlySet<string>,
): PreparedReferralRecipient | null {
  if (lead.pipeline !== "referral") return null;
  if (!REFERRAL_OUTREACH_KINDS.has(lead.kind)) return null;
  if (!REFERRAL_OUTREACH_STAGES.includes(lead.stage as (typeof REFERRAL_OUTREACH_STAGES)[number])) return null;

  const email = lead.emails
    .map(normalizeOutreachEmail)
    .find((candidate) => EMAIL_PATTERN.test(candidate) && !suppressedEmails.has(candidate));
  if (!email) return null;

  return {
    entityId: lead.id,
    name: lead.name,
    email,
    ...(lead.location ? { location: lead.location } : {}),
  };
}

export function renderOutreachTemplate(template: string, recipient: PreparedReferralRecipient) {
  const tokens: Record<string, string> = {
    organization: recipient.name,
    location: recipient.location ?? "your community",
    email: recipient.email,
  };
  return template.replace(/\{\{(organization|location|email)\}\}/g, (_match, token: keyof typeof tokens) => tokens[token]);
}
