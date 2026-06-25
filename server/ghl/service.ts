/**
 * GHL Service Layer
 * Wraps GHL REST API calls for the Peptide Buy Group integration.
 * All calls are fire-and-forget with error logging — GHL failures
 * never block the platform's own operations.
 */

import { GHL_LOCATION_ID, GHL_PIPELINE_ID, GHL_STAGES, GHL_FIELDS, GHL_TAGS } from "./config";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

// ─── Auth ─────────────────────────────────────────────────────────────────────
// GHL API key is stored as an environment variable GHL_API_KEY
function getHeaders() {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error("GHL_API_KEY environment variable is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    Version: "2021-07-28",
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface GhlContact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
}

interface CustomFieldValue {
  key: string;
  field_value: string | number | boolean;
}

// ─── Contact Upsert ───────────────────────────────────────────────────────────
export async function ghlUpsertContact(params: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  tags?: string[];
  customFields?: CustomFieldValue[];
}): Promise<GhlContact | null> {
  try {
    const body: Record<string, unknown> = {
      locationId: GHL_LOCATION_ID,
      email: params.email,
    };
    if (params.firstName) body.firstName = params.firstName;
    if (params.lastName) body.lastName = params.lastName;
    if (params.phone) body.phone = params.phone;
    if (params.tags?.length) body.tags = params.tags;
    if (params.customFields?.length) body.customFields = params.customFields;

    const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[GHL] upsertContact failed (${res.status}): ${err}`);
      return null;
    }

    const data = await res.json() as { contact: GhlContact };
    return data.contact;
  } catch (e) {
    console.error("[GHL] upsertContact error:", e);
    return null;
  }
}

// ─── Add Tags ─────────────────────────────────────────────────────────────────
export async function ghlAddTags(contactId: string, tags: string[]): Promise<void> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[GHL] addTags failed (${res.status}): ${err}`);
    }
  } catch (e) {
    console.error("[GHL] addTags error:", e);
  }
}

// ─── Remove Tags ──────────────────────────────────────────────────────────────
export async function ghlRemoveTags(contactId: string, tags: string[]): Promise<void> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: "DELETE",
      headers: getHeaders(),
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[GHL] removeTags failed (${res.status}): ${err}`);
    }
  } catch (e) {
    console.error("[GHL] removeTags error:", e);
  }
}

// ─── Update Custom Fields ─────────────────────────────────────────────────────
export async function ghlUpdateCustomFields(
  contactId: string,
  fields: CustomFieldValue[]
): Promise<void> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ customFields: fields }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[GHL] updateCustomFields failed (${res.status}): ${err}`);
    }
  } catch (e) {
    console.error("[GHL] updateCustomFields error:", e);
  }
}

// ─── Search Opportunity by Contact ───────────────────────────────────────────
async function findOpportunity(contactId: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      location_id: GHL_LOCATION_ID,
      contact_id: contactId,
      pipeline_id: GHL_PIPELINE_ID,
    });
    const res = await fetch(`${GHL_API_BASE}/opportunities/search?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json() as { opportunities: Array<{ id: string }> };
    return data.opportunities?.[0]?.id ?? null;
  } catch (e) {
    console.error("[GHL] findOpportunity error:", e);
    return null;
  }
}

// ─── Upsert Opportunity ───────────────────────────────────────────────────────
export async function ghlUpsertOpportunity(params: {
  contactId: string;
  contactName: string;
  stageId: string;
  title: string;
  monetaryValue?: number;
  status?: "open" | "won" | "lost" | "abandoned";
}): Promise<string | null> {
  try {
    const existingId = await findOpportunity(params.contactId);

    const body: Record<string, unknown> = {
      pipelineId: GHL_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      name: params.title,
      pipelineStageId: params.stageId,
      status: params.status ?? "open",
      contactId: params.contactId,
    };
    if (params.monetaryValue !== undefined) body.monetaryValue = params.monetaryValue;

    if (existingId) {
      // Update existing opportunity
      const res = await fetch(`${GHL_API_BASE}/opportunities/${existingId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[GHL] updateOpportunity failed (${res.status}): ${err}`);
        return null;
      }
      return existingId;
    } else {
      // Create new opportunity
      const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[GHL] createOpportunity failed (${res.status}): ${err}`);
        return null;
      }
      const data = await res.json() as { opportunity: { id: string } };
      return data.opportunity?.id ?? null;
    }
  } catch (e) {
    console.error("[GHL] upsertOpportunity error:", e);
    return null;
  }
}

// ─── High-Level Event Handlers ────────────────────────────────────────────────

/**
 * Called when a new member signs up or logs in for the first time.
 */
export async function ghlOnMemberSignup(member: {
  email: string;
  name: string | null;
}): Promise<void> {
  const [firstName, ...rest] = (member.name ?? "").split(" ");
  const lastName = rest.join(" ") || undefined;

  const contact = await ghlUpsertContact({
    email: member.email,
    firstName: firstName || undefined,
    lastName,
    tags: [GHL_TAGS.MEMBER],
    customFields: [
      { key: GHL_FIELDS.MEMBER_SINCE, field_value: new Date().toISOString().split("T")[0] },
    ],
  });

  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: member.name ?? member.email,
      stageId: GHL_STAGES.MEMBER_REGISTERED,
      title: `PBG — ${member.name ?? member.email}`,
    });
  }
}

/**
 * Called when a member redeems an invite code.
 */
export async function ghlOnInviteRedeemed(member: {
  email: string;
  name: string | null;
  inviteCode: string;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: member.email,
    tags: [GHL_TAGS.VERIFIED],
    customFields: [
      { key: GHL_FIELDS.INVITE_CODE_USED, field_value: member.inviteCode },
    ],
  });
  if (!contact?.id) return;
}

/**
 * Called when a member places an order.
 */
export async function ghlOnOrderPlaced(params: {
  email: string;
  name: string | null;
  buyName: string;
  orderTotal: number;
  orderId: number;
  totalOrders: number;
  totalSpent: number;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: params.email,
    tags: [GHL_TAGS.ORDERED],
    customFields: [
      { key: GHL_FIELDS.LAST_BUY_NAME,      field_value: params.buyName },
      { key: GHL_FIELDS.LAST_ORDER_DATE,    field_value: new Date().toISOString().split("T")[0] },
      { key: GHL_FIELDS.LAST_ORDER_STATUS,  field_value: "Committed" },
      { key: GHL_FIELDS.LAST_ORDER_AMOUNT,  field_value: params.orderTotal },
      { key: GHL_FIELDS.TOTAL_ORDERS,       field_value: params.totalOrders },
      { key: GHL_FIELDS.TOTAL_SPENT,        field_value: params.totalSpent },
    ],
  });

  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.ORDER_COMMITTED,
      title: `PBG — ${params.name ?? params.email}`,
      monetaryValue: params.orderTotal,
    });
  }
}

/**
 * Called when an admin marks a member's payment as received.
 */
export async function ghlOnPaymentReceived(params: {
  email: string;
  name: string | null;
  orderTotal: number;
  totalSpent: number;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: params.email,
    tags: [GHL_TAGS.PAID],
    customFields: [
      { key: GHL_FIELDS.LAST_ORDER_STATUS, field_value: "Paid" },
      { key: GHL_FIELDS.TOTAL_SPENT,       field_value: params.totalSpent },
    ],
  });

  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.PAYMENT_RECEIVED,
      title: `PBG — ${params.name ?? params.email}`,
      monetaryValue: params.orderTotal,
    });
  }
}

/**
 * Called when an admin marks a buy as "Ordered" (placed with supplier).
 */
export async function ghlOnOrderPlacedWithSupplier(params: {
  email: string;
  name: string | null;
}): Promise<void> {
  const contact = await ghlUpsertContact({ email: params.email });
  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.ORDER_PLACED_SUPPLIER,
      title: `PBG — ${params.name ?? params.email}`,
    });
  }
}

/**
 * Called when a COA is uploaded and testing begins.
 */
export async function ghlOnTestingStarted(params: {
  email: string;
  name: string | null;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: params.email,
    customFields: [{ key: GHL_FIELDS.COA_AVAILABLE, field_value: false }],
  });
  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.TESTING_IN_PROGRESS,
      title: `PBG — ${params.name ?? params.email}`,
    });
  }
}

/**
 * Called when a COA result is published.
 */
export async function ghlOnCoaPublished(params: {
  email: string;
  name: string | null;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: params.email,
    customFields: [{ key: GHL_FIELDS.COA_AVAILABLE, field_value: true }],
  });
  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.READY_TO_SHIP,
      title: `PBG — ${params.name ?? params.email}`,
    });
  }
}

/**
 * Called when an order is marked as Shipped.
 */
export async function ghlOnOrderShipped(params: {
  email: string;
  name: string | null;
  trackingNumber: string | null;
  carrier: string | null;
}): Promise<void> {
  const customFields: CustomFieldValue[] = [
    { key: GHL_FIELDS.LAST_ORDER_STATUS, field_value: "Shipped" },
  ];
  if (params.trackingNumber) customFields.push({ key: GHL_FIELDS.LAST_TRACKING, field_value: params.trackingNumber });
  if (params.carrier) customFields.push({ key: GHL_FIELDS.LAST_CARRIER, field_value: params.carrier });

  const contact = await ghlUpsertContact({
    email: params.email,
    tags: [GHL_TAGS.SHIPPED],
    customFields,
  });

  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.SHIPPED,
      title: `PBG — ${params.name ?? params.email}`,
    });
  }
}

/**
 * Called when an order is marked as Complete.
 */
export async function ghlOnOrderComplete(params: {
  email: string;
  name: string | null;
}): Promise<void> {
  const contact = await ghlUpsertContact({
    email: params.email,
    tags: [GHL_TAGS.COMPLETE],
    customFields: [{ key: GHL_FIELDS.LAST_ORDER_STATUS, field_value: "Complete" }],
  });

  if (contact?.id) {
    await ghlUpsertOpportunity({
      contactId: contact.id,
      contactName: params.name ?? params.email,
      stageId: GHL_STAGES.COMPLETED,
      title: `PBG — ${params.name ?? params.email}`,
      status: "won",
    });
  }
}
