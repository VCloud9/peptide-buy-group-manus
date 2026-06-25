/**
 * Inbound GHL Webhook Handler
 * Handles events pushed from GoHighLevel back to the platform.
 * Registered at POST /api/ghl/webhook
 *
 * GHL webhook payloads vary by workflow action type.
 * Some include an explicit "type" field; others (e.g. Contact Updated action)
 * send a flat contact object with no type discriminator.
 *
 * Detection strategy:
 *  1. Check payload.type or payload.event for explicit event types
 *  2. Fall back to shape-based detection: if payload has email/name fields,
 *     treat it as a ContactUpdated event
 */

import type { Express, Request, Response } from "express";
import { getUserByEmail, updateUserProfile } from "../db";

// Optional: validate a shared secret set in GHL webhook config
function validateSecret(req: Request): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured, allow all
  const incoming = req.headers["x-ghl-signature"] ?? req.headers["x-webhook-secret"];
  return incoming === secret;
}

/**
 * Resolve the event type from the GHL payload.
 * GHL does not always include a "type" field — fall back to shape detection.
 */
function resolveEventType(payload: Record<string, unknown>): string {
  // Explicit type field (some GHL actions include this)
  if (typeof payload.type === "string" && payload.type) return payload.type;
  if (typeof payload.event === "string" && payload.event) return payload.event;

  // Shape-based detection: flat contact object with email or id
  // GHL "Contact Updated" workflow action sends: { id, name, email, phone, ... }
  if (
    (typeof payload.email === "string" || typeof payload.id === "string") &&
    !payload.opportunities &&
    !payload.tags
  ) {
    return "ContactUpdated";
  }

  // Tag change events typically include a "tags" array
  if (Array.isArray(payload.tags)) {
    return "ContactTagChanged";
  }

  // Opportunity events typically include an "opportunities" array or stageId
  if (payload.stageId || payload.pipelineId) {
    return "OpportunityStageChanged";
  }

  return "Unknown";
}

/**
 * Extract contact email from various GHL payload shapes.
 */
function extractEmail(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.email === "string") return payload.email;
  const contact = payload.contact as Record<string, unknown> | undefined;
  if (contact && typeof contact.email === "string") return contact.email;
  return undefined;
}

/**
 * Extract contact name from various GHL payload shapes.
 * GHL sends "name" (full name), "fullName", or separate "firstName"/"lastName".
 */
function extractName(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.name === "string" && payload.name) return payload.name;
  if (typeof payload.fullName === "string" && payload.fullName) return payload.fullName;
  const contact = payload.contact as Record<string, unknown> | undefined;
  if (contact) {
    if (typeof contact.name === "string" && contact.name) return contact.name;
    if (typeof contact.fullName === "string" && contact.fullName) return contact.fullName;
    const first = typeof contact.firstName === "string" ? contact.firstName : "";
    const last = typeof contact.lastName === "string" ? contact.lastName : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
  }
  // Top-level firstName/lastName
  const first = typeof payload.firstName === "string" ? payload.firstName : "";
  const last = typeof payload.lastName === "string" ? payload.lastName : "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return undefined;
}

export function registerGhlWebhookRoute(app: Express) {
  app.post("/api/ghl/webhook", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = req.body as Record<string, unknown>;
    const eventType = resolveEventType(payload);

    console.log(`[GHL Webhook] Received event: ${eventType}`, JSON.stringify(payload).slice(0, 300));

    try {
      switch (eventType) {
        case "ContactUpdated": {
          const email = extractEmail(payload);
          const name = extractName(payload);

          console.log(`[GHL Webhook] ContactUpdated — email: ${email}, name: ${name}`);

          if (email) {
            const user = await getUserByEmail(email);
            if (user) {
              if (name && name !== user.name) {
                await updateUserProfile(user.id, { name });
                console.log(`[GHL Webhook] ✓ Synced name for ${email}: "${user.name}" → "${name}"`);
              } else if (!name) {
                console.log(`[GHL Webhook] No name in payload for ${email}, skipping name sync`);
              } else {
                console.log(`[GHL Webhook] Name unchanged for ${email}, no update needed`);
              }
            } else {
              console.log(`[GHL Webhook] No platform user found for email: ${email}`);
            }
          } else {
            console.log(`[GHL Webhook] ContactUpdated payload has no email — cannot sync`);
          }
          break;
        }

        case "ContactTagChanged":
        case "ContactTagAdded":
        case "ContactTagRemoved":
        case "OpportunityStageChanged":
        case "OpportunityCreated":
          console.log(`[GHL Webhook] Logged event: ${eventType}`);
          break;

        default:
          console.log(`[GHL Webhook] Unrecognized event type: "${eventType}" — raw payload logged above`);
      }

      res.json({ received: true, event: eventType });
    } catch (e) {
      console.error("[GHL Webhook] Handler error:", e);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });
}
