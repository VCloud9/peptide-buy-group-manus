import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  GroupBuy,
  InsertGroupBuy,
  InsertOrder,
  InsertOrderItem,
  InsertParticipationTier,
  InsertProduct,
  InsertTestResult,
  InsertUser,
  Order,
  groupBuys,
  inviteCodeUses,
  inviteCodes,
  orderItems,
  orders,
  participationTiers,
  products,
  skoolWebhookConfig,
  skoolWebhookLog,
  testResults,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  id: number,
  data: Partial<Pick<InsertUser, "name" | "skoolUsername" | "shippingName" | "shippingAddress1" | "shippingAddress2" | "shippingCity" | "shippingState" | "shippingZip" | "shippingCountry">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(id: number, role: "user" | "admin" | "owner") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── Group Buys ───────────────────────────────────────────────────────────────

export async function getAllGroupBuys() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupBuys).orderBy(desc(groupBuys.createdAt));
}

export async function getActiveGroupBuys() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(groupBuys)
    .where(
      sql`${groupBuys.status} NOT IN ('Draft', 'Complete')`
    )
    .orderBy(desc(groupBuys.createdAt));
}

export async function getGroupBuyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groupBuys).where(eq(groupBuys.id, id)).limit(1);
  return result[0];
}

export async function createGroupBuy(data: InsertGroupBuy) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(groupBuys).values(data);
  return result[0];
}

export async function updateGroupBuy(id: number, data: Partial<InsertGroupBuy>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(groupBuys).set(data).where(eq(groupBuys.id, id));
}

export async function deleteGroupBuy(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(groupBuys).where(eq(groupBuys.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProductsByGroupBuy(groupBuyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.groupBuyId, groupBuyId));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(products).values(data);
}

export async function bulkCreateProducts(rows: InsertProduct[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (rows.length === 0) return;
  // Insert in batches of 50 to avoid oversized queries
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(products).values(rows.slice(i, i + BATCH));
  }
}
export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(products).where(eq(products.id, id));
}

// ─── Participation Tiers ──────────────────────────────────────────────────────

export async function getTiersByGroupBuy(groupBuyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(participationTiers)
    .where(eq(participationTiers.groupBuyId, groupBuyId))
    .orderBy(participationTiers.sortOrder);
}

export async function createTier(data: InsertParticipationTier) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(participationTiers).values(data);
}

export async function updateTier(id: number, data: Partial<InsertParticipationTier>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(participationTiers).set(data).where(eq(participationTiers.id, id));
}

export async function deleteTier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(participationTiers).where(eq(participationTiers.id, id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrdersByGroupBuy(groupBuyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.groupBuyId, groupBuyId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(orders).values(data);
  const insertId = (result[0] as any).insertId as number;
  return insertId;
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getUserOrderForGroupBuy(userId: number, groupBuyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.groupBuyId, groupBuyId)))
    .limit(1);
  return result[0];
}

// ─── Order Items ──────────────────────────────────────────────────────────────

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function createOrderItem(data: InsertOrderItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderItems).values(data);
}

export async function deleteOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
}

// ─── Group Buy Stats ──────────────────────────────────────────────────────────

export async function getGroupBuyStats(groupBuyId: number) {
  const db = await getDb();
  if (!db) return { totalCommitted: 0, totalPaid: 0, participantCount: 0, paidCount: 0, shippedCount: 0 };

  const allOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.groupBuyId, groupBuyId));

  const totalCommitted = allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);
  const totalPaid = allOrders
    .filter((o) => o.status === "Paid" || o.status === "Shipped")
    .reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);
  const participantCount = allOrders.length;
  const paidCount = allOrders.filter((o) => o.status === "Paid" || o.status === "Shipped").length;
  const shippedCount = allOrders.filter((o) => o.status === "Shipped").length;

  return { totalCommitted, totalPaid, participantCount, paidCount, shippedCount };
}

// ─── Test Results ─────────────────────────────────────────────────────────────

export async function getTestResultsByGroupBuy(groupBuyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(testResults)
    .where(eq(testResults.groupBuyId, groupBuyId))
    .orderBy(desc(testResults.createdAt));
}

export async function getTestResultById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testResults).where(eq(testResults.id, id)).limit(1);
  return result[0];
}

export async function createTestResult(data: InsertTestResult) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(testResults).values(data);
  const insertId = (result[0] as any).insertId as number;
  return insertId;
}

export async function updateTestResult(id: number, data: Partial<InsertTestResult>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(testResults).set(data).where(eq(testResults.id, id));
}

// ─── Skool Webhook ────────────────────────────────────────────────────────────

export async function getSkoolWebhookConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(skoolWebhookConfig).limit(1);
  return result[0];
}

export async function upsertSkoolWebhookConfig(data: { webhookUrl: string; groupSlug?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getSkoolWebhookConfig();
  if (existing) {
    await db.update(skoolWebhookConfig).set(data).where(eq(skoolWebhookConfig.id, existing.id));
  } else {
    await db.insert(skoolWebhookConfig).values({ webhookUrl: data.webhookUrl, groupSlug: data.groupSlug, isActive: data.isActive ?? true });
  }
}

export async function logSkoolWebhook(data: {
  groupBuyId?: number;
  event: "buy_live" | "moq_reached" | "test_results_posted" | "orders_shipped";
  payload: string;
  responseStatus?: number;
  success: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(skoolWebhookLog).values(data);
}

export async function getSkoolWebhookLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skoolWebhookLog).orderBy(desc(skoolWebhookLog.sentAt)).limit(limit);
}

// ─── Invite Codes ────────────────────────────────────────────────────────────

export async function createInviteCode(data: {
  code: string;
  label?: string;
  maxUses?: number;
  expiresAt?: Date;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(inviteCodes).values(data);
  return data.code;
}

export async function getAllInviteCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function getInviteCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code.toUpperCase())).limit(1);
  return rows[0];
}

export async function revokeInviteCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(inviteCodes).set({ isActive: false }).where(eq(inviteCodes.id, id));
}

export async function redeemInviteCode(code: string, userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "DB unavailable" };

  const invite = await getInviteCodeByCode(code);
  if (!invite) return { success: false, error: "Invalid invite code" };
  if (!invite.isActive) return { success: false, error: "This invite code has been revoked" };
  if (invite.expiresAt && new Date() > invite.expiresAt) return { success: false, error: "This invite code has expired" };
  if (invite.maxUses !== null && invite.usedCount >= (invite.maxUses ?? Infinity)) {
    return { success: false, error: "This invite code has reached its maximum uses" };
  }

  // Check if user already used any invite code
  const existing = await db.select().from(inviteCodeUses).where(eq(inviteCodeUses.userId, userId)).limit(1);
  if (existing.length > 0) return { success: true }; // already onboarded

  await db.insert(inviteCodeUses).values({ inviteCodeId: invite.id, userId });
  await db.update(inviteCodes).set({ usedCount: invite.usedCount + 1 }).where(eq(inviteCodes.id, invite.id));
  return { success: true };
}

export async function getUserInviteStatus(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(inviteCodeUses).where(eq(inviteCodeUses.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function getInviteCodeUses(inviteCodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ use: inviteCodeUses, user: users })
    .from(inviteCodeUses)
    .where(eq(inviteCodeUses.inviteCodeId, inviteCodeId))
    .leftJoin(users, eq(inviteCodeUses.userId, users.id))
    .orderBy(desc(inviteCodeUses.usedAt));
}

// ─── User Order Stats (for GHL sync) ────────────────────────────────────────

export async function getUserOrderStats(userId: number): Promise<{ totalOrders: number; totalSpent: number }> {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalSpent: 0 };
  const rows = await db.select().from(orders).where(eq(orders.userId, userId));
  const totalOrders = rows.length;
  const totalSpent = rows.reduce((sum, o) => sum + parseFloat(String(o.totalAmount ?? 0)), 0);
  return { totalOrders, totalSpent };
}

export async function getOrderWithUser(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: orders, user: users })
    .from(orders)
    .where(eq(orders.id, orderId))
    .leftJoin(users, eq(orders.userId, users.id))
    .limit(1);
  return result[0];
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export async function getAdminReportData(groupBuyId: number) {
  const db = await getDb();
  if (!db) return null;

  const buy = await getGroupBuyById(groupBuyId);
  if (!buy) return null;

  const allOrders = await db
    .select({
      order: orders,
      user: users,
    })
    .from(orders)
    .where(eq(orders.groupBuyId, groupBuyId))
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  const stats = await getGroupBuyStats(groupBuyId);

  return { buy, orders: allOrders, stats };
}
