/**
 * GoHighLevel (GHL) Integration Config
 * Sub-account: Certapep
 * Location ID: t9b6FAsOCqtsJ57Zl5il
 */

export const GHL_LOCATION_ID = "t9b6FAsOCqtsJ57Zl5il";

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export const GHL_PIPELINE_ID = "NHCezPhyoywoNZ31hNXt";

export const GHL_STAGES = {
  MEMBERSHIP_REQUESTED:    "PLACEHOLDER_MEMBERSHIP_REQUESTED",  // TODO: replace with real stage ID after creating in GHL
  MEMBER_REGISTERED:       "0cc7a96b-ed9c-4bc9-987d-190dc7ab592a",
  ORDER_COMMITTED:         "197babac-f41d-4176-92db-0200fbfdc0c8",
  PAYMENT_PENDING:         "336a6722-7800-42b5-a49e-37d09eda5a48",
  PAYMENT_RECEIVED:        "b4b9a385-01ec-4f34-8dfe-d6af89112ac9",
  ORDER_PLACED_SUPPLIER:   "d91c5ab7-7e39-4538-a2d0-72aac764bcc1",
  TESTING_IN_PROGRESS:     "739c4e90-82f2-4282-a8ad-d3b60b172c06",
  READY_TO_SHIP:           "b56d3d7c-31a4-42aa-86fe-f7125dd50bca",
  SHIPPED:                 "3f78b92a-3c7c-4338-acde-1937ddb7f68a",
  COMPLETED:               "3d718c6a-d151-477a-96de-ad48a4c5e5d1",
} as const;

// ─── Custom Field Keys ────────────────────────────────────────────────────────
export const GHL_FIELDS = {
  MEMBER_SINCE:       "contact.pbg_member_since",
  INVITE_CODE_USED:   "contact.pbg_invite_code_used",
  TOTAL_ORDERS:       "contact.pbg_total_orders",
  TOTAL_SPENT:        "contact.pbg_total_spent",
  LAST_BUY_NAME:      "contact.pbg_last_buy_name",
  LAST_ORDER_DATE:    "contact.pbg_last_order_date",
  LAST_ORDER_STATUS:  "contact.pbg_last_order_status",
  LAST_ORDER_AMOUNT:  "contact.pbg_last_order_amount",
  LAST_TRACKING:      "contact.pbg_last_tracking_number",
  LAST_CARRIER:       "contact.pbg_last_carrier",
  COA_AVAILABLE:      "contact.pbg_coa_available",
  INVITE_CODE:        "contact.pbg_invite_code",  // TODO: create this custom field in GHL
} as const;

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const GHL_TAGS = {
  ACCESS_REQUESTED: "pbg-access-requested",
  APPROVED:         "pbg-approved",
  INVITE_SENT:      "pbg-invite-sent",
  MEMBER:           "pbg-member",
  VERIFIED:         "pbg-verified",
  ORDERED:          "pbg-ordered",
  PAYMENT_PENDING:  "pbg-payment-pending",
  PAID:             "pbg-paid",
  SHIPPED:          "pbg-shipped",
  COMPLETE:         "pbg-complete",
} as const;
