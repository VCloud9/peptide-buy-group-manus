import {
  bigint,
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "owner"]).default("user").notNull(),
  skoolUsername: varchar("skoolUsername", { length: 128 }),
  shippingName: text("shippingName"),
  shippingAddress1: text("shippingAddress1"),
  shippingAddress2: text("shippingAddress2"),
  shippingCity: varchar("shippingCity", { length: 128 }),
  shippingState: varchar("shippingState", { length: 64 }),
  shippingZip: varchar("shippingZip", { length: 20 }),
  shippingCountry: varchar("shippingCountry", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Group Buys ───────────────────────────────────────────────────────────────

export const groupBuys = mysqlTable("group_buys", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "Draft",
    "Gathering",
    "Funded",
    "Ordered",
    "Testing",
    "Distributing",
    "Complete",
  ])
    .default("Draft")
    .notNull(),
  moqTarget: decimal("moqTarget", { precision: 12, scale: 2 }).notNull(),
  participantCap: int("participantCap"),
  endDate: timestamp("endDate"),
  vendorName: varchar("vendorName", { length: 255 }),
  vendorCountry: varchar("vendorCountry", { length: 128 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupBuy = typeof groupBuys.$inferSelect;
export type InsertGroupBuy = typeof groupBuys.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  groupBuyId: int("groupBuyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 64 }).default("vial").notNull(),
  minQuantity: int("minQuantity").default(1).notNull(),
  maxQuantity: int("maxQuantity"),
  inStock: boolean("inStock").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Participation Tiers ──────────────────────────────────────────────────────

export const participationTiers = mysqlTable("participation_tiers", {
  id: int("id").autoincrement().primaryKey(),
  groupBuyId: int("groupBuyId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  minAmount: decimal("minAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParticipationTier = typeof participationTiers.$inferSelect;
export type InsertParticipationTier = typeof participationTiers.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupBuyId: int("groupBuyId").notNull(),
  tierId: int("tierId"),
  status: mysqlEnum("status", [
    "Committed",
    "Payment Pending",
    "Paid",
    "Shipped",
  ])
    .default("Committed")
    .notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  trackingCarrier: varchar("trackingCarrier", { length: 128 }),
  shippingName: text("shippingName"),
  shippingAddress1: text("shippingAddress1"),
  shippingAddress2: text("shippingAddress2"),
  shippingCity: varchar("shippingCity", { length: 128 }),
  shippingState: varchar("shippingState", { length: 64 }),
  shippingZip: varchar("shippingZip", { length: 20 }),
  shippingCountry: varchar("shippingCountry", { length: 64 }),
  adminNotes: text("adminNotes"),
  shippedAt: timestamp("shippedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Test Results ─────────────────────────────────────────────────────────────

export const testResults = mysqlTable("test_results", {
  id: int("id").autoincrement().primaryKey(),
  groupBuyId: int("groupBuyId").notNull(),
  productId: int("productId"),
  labName: varchar("labName", { length: 255 }).default("Freedom Diagnostics").notNull(),
  status: mysqlEnum("status", [
    "Pending",
    "Samples Sent",
    "In Testing",
    "Results Ready",
    "Published",
    "Failed",
  ])
    .default("Pending")
    .notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;

// ─── Skool Webhook Config ─────────────────────────────────────────────────────

export const skoolWebhookConfig = mysqlTable("skool_webhook_config", {
  id: int("id").autoincrement().primaryKey(),
  webhookUrl: text("webhookUrl").notNull(),
  groupSlug: varchar("groupSlug", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SkoolWebhookConfig = typeof skoolWebhookConfig.$inferSelect;

// ─── Skool Webhook Log ────────────────────────────────────────────────────────

export const skoolWebhookLog = mysqlTable("skool_webhook_log", {
  id: int("id").autoincrement().primaryKey(),
  groupBuyId: int("groupBuyId"),
  event: mysqlEnum("event", [
    "buy_live",
    "moq_reached",
    "test_results_posted",
    "orders_shipped",
  ]).notNull(),
  payload: text("payload"),
  responseStatus: int("responseStatus"),
  success: boolean("success").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type SkoolWebhookLog = typeof skoolWebhookLog.$inferSelect;

// ─── Invite Codes ─────────────────────────────────────────────────────────────

export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  label: varchar("label", { length: 128 }),          // e.g. "Skool batch Jan 2026"
  maxUses: int("maxUses"),                            // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

// ─── Invite Code Uses ─────────────────────────────────────────────────────────

export const inviteCodeUses = mysqlTable("invite_code_uses", {
  id: int("id").autoincrement().primaryKey(),
  inviteCodeId: int("inviteCodeId").notNull(),
  userId: int("userId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type InviteCodeUse = typeof inviteCodeUses.$inferSelect;
