import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["user", "admin", "owner"]);
export const groupBuyStatusEnum = pgEnum("group_buy_status", [
  "Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "Committed", "Payment Pending", "Paid", "Shipped",
]);
export const testResultStatusEnum = pgEnum("test_result_status", [
  "Pending", "Samples Sent", "In Testing", "Results Ready", "Published", "Failed",
]);
export const skoolWebhookEventEnum = pgEnum("skool_webhook_event", [
  "buy_live", "moq_reached", "test_results_posted", "orders_shipped",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "pending", "approved", "rejected", "invite_sent",
]);
export const ghlDirectionEnum = pgEnum("ghl_direction", ["outbound", "inbound"]);
export const priceSourceEnum = pgEnum("price_source", ["import", "manual"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  skoolUsername: varchar("skoolUsername", { length: 128 }),
  shippingName: text("shippingName"),
  shippingAddress1: text("shippingAddress1"),
  shippingAddress2: text("shippingAddress2"),
  shippingCity: varchar("shippingCity", { length: 128 }),
  shippingState: varchar("shippingState", { length: 64 }),
  shippingZip: varchar("shippingZip", { length: 20 }),
  shippingCountry: varchar("shippingCountry", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Group Buys ───────────────────────────────────────────────────────────────

export const groupBuys = pgTable("group_buys", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: groupBuyStatusEnum("status").default("Draft").notNull(),
  moqTarget: numeric("moqTarget", { precision: 12, scale: 2 }).notNull(),
  participantCap: integer("participantCap"),
  endDate: timestamp("endDate"),
  vendorId: integer("vendorId"),
  vendorName: varchar("vendorName", { length: 255 }),
  vendorCountry: varchar("vendorCountry", { length: 128 }),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GroupBuy = typeof groupBuys.$inferSelect;
export type InsertGroupBuy = typeof groupBuys.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  groupBuyId: integer("groupBuyId").notNull(),
  vendorSkuId: integer("vendorSkuId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pricePerUnit: numeric("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 64 }).default("vial").notNull(),
  minQuantity: integer("minQuantity").default(1).notNull(),
  maxQuantity: integer("maxQuantity"),
  inStock: boolean("inStock").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Participation Tiers ──────────────────────────────────────────────────────

export const participationTiers = pgTable("participation_tiers", {
  id: serial("id").primaryKey(),
  groupBuyId: integer("groupBuyId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  minAmount: numeric("minAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParticipationTier = typeof participationTiers.$inferSelect;
export type InsertParticipationTier = typeof participationTiers.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  groupBuyId: integer("groupBuyId").notNull(),
  tierId: integer("tierId"),
  status: orderStatusEnum("status").default("Committed").notNull(),
  totalAmount: numeric("totalAmount", { precision: 12, scale: 2 }).notNull(),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  trackingCarrier: varchar("trackingCarrier", { length: 128 }),
  shippingName: text("shippingName"),
  shippingAddress1: text("shippingAddress1"),
  shippingAddress2: text("shippingAddress2"),
  shippingCity: varchar("shippingCity", { length: 128 }),
  shippingState: varchar("shippingState", { length: 64 }),
  shippingZip: varchar("shippingZip", { length: 20 }),
  shippingCountry: varchar("shippingCountry", { length: 64 }),
  memberNote: text("memberNote"),
  adminNotes: text("adminNotes"),
  shippedAt: timestamp("shippedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Test Results ─────────────────────────────────────────────────────────────

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  groupBuyId: integer("groupBuyId").notNull(),
  productId: integer("productId"),
  labName: varchar("labName", { length: 255 }).default("Freedom Diagnostics").notNull(),
  status: testResultStatusEnum("status").default("Pending").notNull(),
  coaFileKey: varchar("coaFileKey", { length: 512 }),
  coaFileUrl: text("coaFileUrl"),
  coaAccessionNumber: varchar("coaAccessionNumber", { length: 128 }),
  purityResult: varchar("purityResult", { length: 64 }),
  identityConfirmed: boolean("identityConfirmed"),
  sampleSentAt: timestamp("sampleSentAt"),
  resultReceivedAt: timestamp("resultReceivedAt"),
  publishedAt: timestamp("publishedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;

// ─── Skool Webhook Config ─────────────────────────────────────────────────────

export const skoolWebhookConfig = pgTable("skool_webhook_config", {
  id: serial("id").primaryKey(),
  webhookUrl: text("webhookUrl").notNull(),
  groupSlug: varchar("groupSlug", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SkoolWebhookConfig = typeof skoolWebhookConfig.$inferSelect;

// ─── Skool Webhook Log ────────────────────────────────────────────────────────

export const skoolWebhookLog = pgTable("skool_webhook_log", {
  id: serial("id").primaryKey(),
  groupBuyId: integer("groupBuyId"),
  event: skoolWebhookEventEnum("event").notNull(),
  payload: text("payload"),
  responseStatus: integer("responseStatus"),
  success: boolean("success").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type SkoolWebhookLog = typeof skoolWebhookLog.$inferSelect;

// ─── Invite Codes ─────────────────────────────────────────────────────────────

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  label: varchar("label", { length: 128 }),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

// ─── Invite Code Uses ─────────────────────────────────────────────────────────

export const inviteCodeUses = pgTable("invite_code_uses", {
  id: serial("id").primaryKey(),
  inviteCodeId: integer("inviteCodeId").notNull(),
  userId: integer("userId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type InviteCodeUse = typeof inviteCodeUses.$inferSelect;

// ─── GHL Sync Logs ───────────────────────────────────────────────────────────

export const ghlSyncLogs = pgTable("ghl_sync_logs", {
  id: serial("id").primaryKey(),
  direction: ghlDirectionEnum("direction").notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  userId: integer("userId"),
  payload: text("payload"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GhlSyncLog = typeof ghlSyncLogs.$inferSelect;
export type InsertGhlSyncLog = typeof ghlSyncLogs.$inferInsert;

// ─── Membership Requests ─────────────────────────────────────────────────────

export const membershipRequests = pgTable("membership_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  skoolUsername: varchar("skoolUsername", { length: 128 }),
  message: text("message"),
  status: membershipStatusEnum("status").default("pending").notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }),
  ghlContactId: varchar("ghlContactId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MembershipRequest = typeof membershipRequests.$inferSelect;
export type InsertMembershipRequest = typeof membershipRequests.$inferInsert;

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  website: varchar("website", { length: 512 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  whatsappNumber: varchar("whatsappNumber", { length: 50 }),
  notes: text("notes"),
  negotiatedDiscountPct: numeric("negotiatedDiscountPct", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor SKUs ──────────────────────────────────────────────────────────────

export const vendorSkus = pgTable("vendor_skus", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendorId").notNull(),
  skuCode: varchar("skuCode", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  alias: varchar("alias", { length: 128 }),
  productLine: varchar("productLine", { length: 128 }),
  description: text("description"),
  unit: varchar("unit", { length: 64 }).default("vial").notNull(),
  currentPrice: numeric("currentPrice", { precision: 10, scale: 2 }).notNull(),
  minQuantity: integer("minQuantity").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VendorSku = typeof vendorSkus.$inferSelect;
export type InsertVendorSku = typeof vendorSkus.$inferInsert;

// ─── SKU Price History ────────────────────────────────────────────────────────

export const skuPriceHistory = pgTable("sku_price_history", {
  id: serial("id").primaryKey(),
  vendorSkuId: integer("vendorSkuId").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  effectiveAt: timestamp("effectiveAt").defaultNow().notNull(),
  source: priceSourceEnum("source").notNull(),
  recordedBy: integer("recordedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SkuPriceHistory = typeof skuPriceHistory.$inferSelect;
export type InsertSkuPriceHistory = typeof skuPriceHistory.$inferInsert;

// ─── Vendor Ratings ───────────────────────────────────────────────────────────

export const vendorRatings = pgTable("vendor_ratings", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendorId").notNull(),
  userId: integer("userId").notNull(),
  groupBuyId: integer("groupBuyId").notNull(),
  qualityScore: smallint("qualityScore").notNull(),
  commScore: smallint("commScore").notNull(),
  speedScore: smallint("speedScore").notNull(),
  packagingScore: smallint("packagingScore").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VendorRating = typeof vendorRatings.$inferSelect;
export type InsertVendorRating = typeof vendorRatings.$inferInsert;

// ─── Vendor SKU COAs ─────────────────────────────────────────────────────────

export const vendorSkuCoas = pgTable("vendor_sku_coas", {
  id: serial("id").primaryKey(),
  vendorSkuId: integer("vendorSkuId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  labName: varchar("labName", { length: 255 }),
  purityPct: numeric("purityPct", { precision: 5, scale: 2 }),
  testedAt: timestamp("testedAt"),
  notes: text("notes"),
  uploadedBy: integer("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorSkuCoa = typeof vendorSkuCoas.$inferSelect;
export type InsertVendorSkuCoa = typeof vendorSkuCoas.$inferInsert;

// ─── Vendor SKU Price Tiers ───────────────────────────────────────────────────

export const vendorSkuTiers = pgTable("vendor_sku_tiers", {
  id: serial("id").primaryKey(),
  vendorSkuId: integer("vendorSkuId").notNull(),
  minQty: integer("minQty").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VendorSkuTier = typeof vendorSkuTiers.$inferSelect;
export type InsertVendorSkuTier = typeof vendorSkuTiers.$inferInsert;
