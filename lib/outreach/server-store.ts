import { getPrisma } from "@/lib/db/prisma";
import {
  normalizeOutreachEmail,
  outreachDraftInputSchema,
  outreachSuppressionInputSchema,
  prepareReferralRecipient,
  type OutreachDraftInput,
  type OutreachSuppressionInput,
  type ReferralOutreachLead,
} from "@/lib/outreach/model";

export { outreachDraftInputSchema, outreachSuppressionInputSchema } from "@/lib/outreach/model";
export type { OutreachDraftInput, OutreachSuppressionInput } from "@/lib/outreach/model";

const TEMPLATE_VERSION = 1;

export class OutreachEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutreachEligibilityError";
  }
}

export async function listDurableOutreachWorkspace() {
  const prisma = getPrisma();
  if (!prisma) return null;

  const [campaigns, suppressionRows] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "reviewed", channel: "email" },
      include: { recipients: { orderBy: { id: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.suppressionRecord.findMany({
      where: { kind: "email" },
      orderBy: { createdAt: "desc" },
      take: 5_000,
    }),
  ]);

  return {
    drafts: campaigns.map(toClientDraft).filter(isClientDraft),
    suppressions: suppressionRows.map((row) => normalizeOutreachEmail(row.value)).filter(Boolean),
  };
}

export async function upsertDurableOutreachDraft(input: OutreachDraftInput) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const [leadRows, suppressionRows] = await Promise.all([
    prisma.crmLead.findMany({ where: { sourceKey: { in: input.recipientIds } } }),
    prisma.suppressionRecord.findMany({ where: { kind: "email" } }),
  ]);
  const suppressed = new Set(suppressionRows.map((row) => normalizeOutreachEmail(row.value)));
  const prepared = leadRows
    .map((row) => prepareReferralRecipient(toReferralLead(row), suppressed))
    .filter((recipient): recipient is NonNullable<typeof recipient> => recipient !== null);
  const preparedById = new Map(prepared.map((recipient) => [recipient.entityId, recipient]));
  const orderedRecipients = input.recipientIds.map((id) => preparedById.get(id));

  if (orderedRecipients.some((recipient) => !recipient)) {
    throw new OutreachEligibilityError("One or more selected recipients are no longer eligible for referral outreach.");
  }

  const recipients = orderedRecipients.filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient));
  const reviewedAt = input.updatedAt ?? new Date().toISOString();
  const template = JSON.stringify({
    version: TEMPLATE_VERSION,
    subject: input.subject,
    body: input.body,
    reviewedAt,
  });

  const campaign = await prisma.$transaction(async (tx) => {
    const row = await tx.campaign.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        name: input.name,
        status: "reviewed",
        channel: "email",
        template,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      },
      update: {
        name: input.name,
        status: "reviewed",
        channel: "email",
        template,
      },
    });

    await tx.campaignRecipient.deleteMany({ where: { campaignId: row.id } });
    await tx.campaignRecipient.createMany({
      data: recipients.map((recipient) => ({
        campaignId: row.id,
        entityType: "crm_lead",
        entityId: recipient.entityId,
        email: recipient.email,
        status: "queued",
      })),
    });
    return row;
  });

  return {
    id: campaign.id,
    name: campaign.name,
    subject: input.subject,
    body: input.body,
    recipientIds: recipients.map((recipient) => recipient.entityId),
    status: "reviewed" as const,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export async function upsertDurableOutreachSuppression(input: OutreachSuppressionInput) {
  const prisma = getPrisma();
  if (!prisma) return null;
  const row = await prisma.suppressionRecord.upsert({
    where: { value: input.email },
    create: {
      value: input.email,
      kind: "email",
      reason: "Manual Clear Steps outreach suppression",
    },
    update: {
      kind: "email",
      reason: "Manual Clear Steps outreach suppression",
    },
  });
  return normalizeOutreachEmail(row.value);
}

function toReferralLead(row: {
  sourceKey: string;
  name: string;
  kind: string;
  pipeline: string;
  stage: string;
  primaryEmail: string | null;
  location: string | null;
}): ReferralOutreachLead {
  return {
    id: row.sourceKey,
    name: row.name,
    kind: row.kind,
    pipeline: row.pipeline,
    stage: row.stage,
    emails: row.primaryEmail ? [row.primaryEmail] : [],
    ...(row.location ? { location: row.location } : {}),
  };
}

function toClientDraft(row: {
  id: string;
  name: string;
  template: string | null;
  createdAt: Date;
  updatedAt: Date;
  recipients: Array<{ entityId: string }>;
}) {
  const template = parseTemplate(row.template);
  if (!template) return null;
  return {
    id: row.id,
    name: row.name,
    subject: template.subject,
    body: template.body,
    recipientIds: Array.from(new Set(row.recipients.map((recipient) => recipient.entityId))),
    status: "reviewed" as const,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseTemplate(value: string | null): { subject: string; body: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { version?: unknown; subject?: unknown; body?: unknown };
    if (parsed.version !== TEMPLATE_VERSION || typeof parsed.subject !== "string" || typeof parsed.body !== "string") return null;
    if (!parsed.subject.trim() || !parsed.body.trim()) return null;
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    return null;
  }
}

function isClientDraft<T>(value: T | null): value is T {
  return value !== null;
}
