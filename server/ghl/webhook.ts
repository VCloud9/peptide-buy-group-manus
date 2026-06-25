/**
 * Inbound GHL Webhook Handler
 * Handles events pushed from GoHighLevel back to the platform.
 * Registered at POST /api/ghl/webhook
 *
 * Supported inbound events:
 * - ContactTagAdded / ContactTagRemoved  → log for visibility
 * - OpportunityStageChanged              → log for visibility (future: sync order status)
 * - ContactUpdated                       → update member profile if email matches
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

export function registerGhlWebhookRoute(app: Express) {
  app.post("/api/ghl/webhook", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = req.body as Record<string, unknown>;
    const eventType = (payload.type ?? payload.event ?? "") as string;

    console.log(`[GHL Webhook] Received event: ${eventType}`, JSON.stringify(payload).slice(0, 200));

    try {
      switch (eventType) {
        case "ContactUpdated": {
          // If GHL updates a contact's name/phone, sync back to the platform user
          const email = (payload.email ?? (payload.contact as any)?.email) as string | undefined;
          const name = (payload.fullName ?? (payload.contact as any)?.fullName) as string | undefined;
          if (email) {
            const user = await getUserByEmail(email);
            if (user && name && name !== user.name) {
              await updateUserProfile(user.id, { name });
              console.log(`[GHL Webhook] Updated user name for ${email} to "${name}"`);
            }
          }
          break;
        }

        case "ContactTagAdded":
        case "ContactTagRemoved":
        case "OpportunityStageChanged":
        case "OpportunityCreated":
          // Log for visibility — no action needed in V1
          console.log(`[GHL Webhook] Logged event: ${eventType}`);
          break;

        default:
          console.log(`[GHL Webhook] Unhandled event type: ${eventType}`);
      }

      res.json({ received: true, event: eventType });
    } catch (e) {
      console.error("[GHL Webhook] Handler error:", e);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });
}
