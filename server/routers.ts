import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  createGroupBuy,
  createOrder,
  createOrderItem,
  createProduct,
  bulkCreateProducts,
  createTestResult,
  createTier,
  deleteGroupBuy,
  deleteOrderItems,
  deleteProduct,
  deleteTier,
  getActiveGroupBuys,
  getAdminReportData,
  getAllGroupBuys,
  getAllUsers,
  getGroupBuyById,
  getGroupBuyStats,
  getOrderById,
  getOrderItems,
  getOrdersByGroupBuy,
  getOrdersByUser,
  getProductById,
  getProductsByGroupBuy,
  getSkoolWebhookConfig,
  getSkoolWebhookLogs,
  getTestResultById,
  getTestResultsByGroupBuy,
  getTiersByGroupBuy,
  getUserById,
  getUserByOpenId,
  getUserOrderForGroupBuy,
  logSkoolWebhook,
  updateGroupBuy,
  updateOrder,
  updateProduct,
  updateTestResult,
  updateTier,
  updateUserProfile,
  updateUserRole,
  upsertSkoolWebhookConfig,
  upsertUser,
  createInviteCode,
  getAllInviteCodes,
  revokeInviteCode,
  redeemInviteCode,
  getUserInviteStatus,
  getInviteCodeUses,
  getUserOrderStats,
  getOrderWithUser,
  createMembershipRequest,
  getMembershipRequestByEmail,
  getAllMembershipRequests,
  updateMembershipRequest,
  // Vendor catalog
  getAllVendors,
  getActiveVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deactivateVendor,
  getSkusByVendor,
  getSkuById,
  createSku,
  updateSku,
  deactivateSku,
  upsertVendorSku,
  getPriceHistoryBySku,
  recordManualPriceChange,
  getVendorRatings,
  getVendorRatingSummary,
  upsertVendorRating,
  insertSkuCoa,
  listSkuCoas,
  deleteSkuCoa,
  getLatestSkuPurity,
  getTiersBySkuId,
  upsertSkuTiers,
  calcEffectivePrice,
  searchSkusAcrossVendors,
  getSkusWithTiersForVendor,
  exportAllSkus,
} from "./db";
import {
  ghlOnMemberSignup,
  ghlOnInviteRedeemed,
  ghlOnOrderPlaced,
  ghlOnPaymentPending,
  ghlOnPaymentReceived,
  ghlOnOrderPlacedWithSupplier,
  ghlOnTestingStarted,
  ghlOnCoaPublished,
  ghlOnOrderShipped,
  ghlOnOrderComplete,
  ghlResyncMember,
  ghlAddContactNote,
  ghlOnAccessRequested,
  ghlOnMemberApproved,
  ghlOnPaymentConfirmed,
} from "./ghl/service";
import { insertGhlSyncLog, getRecentGhlSyncLogs } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";

// ─── Admin guard ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Skool webhook helper ─────────────────────────────────────────────────────

async function fireSkoolWebhook(
  event: "buy_live" | "moq_reached" | "test_results_posted" | "orders_shipped",
  groupBuyId: number,
  payload: Record<string, unknown>
) {
  const config = await getSkoolWebhookConfig();
  if (!config || !config.isActive || !config.webhookUrl) return;

  const body = JSON.stringify({ event, groupBuyId, ...payload, timestamp: new Date().toISOString() });
  let responseStatus: number | undefined;
  let success = false;

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    responseStatus = res.status;
    success = res.ok;
  } catch (err) {
    console.error("[Skool Webhook] Failed to send:", err);
  }

  await logSkoolWebhook({ groupBuyId, event, payload: body, responseStatus, success });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users ────────────────────────────────────────────────────────────────

  users: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return getUserByOpenId(ctx.user.openId);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          skoolUsername: z.string().optional(),
          shippingName: z.string().optional(),
          shippingAddress1: z.string().optional(),
          shippingAddress2: z.string().optional(),
          shippingCity: z.string().optional(),
          shippingState: z.string().optional(),
          shippingZip: z.string().optional(),
          shippingCountry: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "owner"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ─── Group Buys ───────────────────────────────────────────────────────────

  groupBuys: router({
    list: adminProcedure.query(async () => {
      return getAllGroupBuys();
    }),

    listActive: publicProcedure.query(async () => {
      return getActiveGroupBuys();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const buy = await getGroupBuyById(input.id);
        if (!buy) throw new TRPCError({ code: "NOT_FOUND" });
        return buy;
      }),

    getWithDetails: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const buy = await getGroupBuyById(input.id);
        if (!buy) throw new TRPCError({ code: "NOT_FOUND" });
        const [prods, tiers, stats] = await Promise.all([
          getProductsByGroupBuy(input.id),
          getTiersByGroupBuy(input.id),
          getGroupBuyStats(input.id),
        ]);
        return { buy, products: prods, tiers, stats };
      }),

    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          moqTarget: z.string(),
          participantCap: z.number().optional(),
          endDate: z.string().optional(),
          vendorId: z.number().optional(),
          vendorName: z.string().optional(),
          vendorCountry: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const newId = await createGroupBuy({
          ...input,
          moqTarget: input.moqTarget,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          createdBy: ctx.user.id,
          status: "Draft",
        });
        return { success: true, id: newId };
      }),

    // Create a draft buy pre-loaded with products from the Price Finder basket
    createFromBasket: adminProcedure
      .input(
        z.object({
          title: z.string().optional(),
          items: z.array(
            z.object({
              vendorSkuId: z.number().int(),
              name: z.string().min(1),
              unit: z.string().default("vial"),
              pricePerUnit: z.string(),
              minQuantity: z.number().int().min(1).default(1),
            })
          ).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const title = input.title ?? `Basket Buy — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        const buyId = await createGroupBuy({
          title,
          moqTarget: "0",
          createdBy: ctx.user.id,
          status: "Draft",
        });
        // Create all products in parallel
        await Promise.all(
          input.items.map((item) =>
            createProduct({
              groupBuyId: buyId,
              vendorSkuId: item.vendorSkuId,
              name: item.name,
              unit: item.unit,
              pricePerUnit: item.pricePerUnit,
              minQuantity: item.minQuantity,
            })
          )
        );
        return { id: buyId };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          moqTarget: z.string().optional(),
          participantCap: z.number().optional().nullable(),
          endDate: z.string().optional().nullable(),
          vendorId: z.number().optional().nullable(),
          vendorName: z.string().optional(),
          vendorCountry: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, endDate, ...rest } = input;
        await updateGroupBuy(id, {
          ...rest,
          endDate: endDate ? new Date(endDate) : endDate === null ? undefined : undefined,
        });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete"]),
        })
      )
      .mutation(async ({ input }) => {
        const buy = await getGroupBuyById(input.id);
        if (!buy) throw new TRPCError({ code: "NOT_FOUND" });
        await updateGroupBuy(input.id, { status: input.status });

        // Fire Skool webhooks on key transitions
        if (input.status === "Gathering") {
          await fireSkoolWebhook("buy_live", input.id, { title: buy.title });
        } else if (input.status === "Funded") {
          await fireSkoolWebhook("moq_reached", input.id, { title: buy.title });
        } else if (input.status === "Distributing") {
          await fireSkoolWebhook("orders_shipped", input.id, { title: buy.title });
        }

        // GHL: buy lifecycle — fan out to all members of this buy
        try {
          const buyOrders = await getOrdersByGroupBuy(input.id);
          if (input.status === "Ordered") {
            for (const o of buyOrders) {
              const row = await getOrderWithUser(o.id);
              if (row?.user?.email) {
                ghlOnOrderPlacedWithSupplier({ email: row.user.email, name: row.user.name })
                  .catch((e) => console.error("[GHL] onOrderPlacedWithSupplier error:", e));
              }
            }
          } else if (input.status === "Testing") {
            for (const o of buyOrders) {
              const row = await getOrderWithUser(o.id);
              if (row?.user?.email) {
                ghlOnTestingStarted({ email: row.user.email, name: row.user.name })
                  .catch((e) => console.error("[GHL] onTestingStarted error:", e));
              }
            }
          } else if (input.status === "Complete") {
            for (const o of buyOrders) {
              const row = await getOrderWithUser(o.id);
              if (row?.user?.email) {
                ghlOnOrderComplete({ email: row.user.email, name: row.user.name })
                  .catch((e) => console.error("[GHL] onOrderComplete error:", e));
              }
            }
          }
        } catch (e) { console.error("[GHL] buy lifecycle GHL sync error:", e); }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGroupBuy(input.id);
        return { success: true };
      }),

    // Clone an existing buy (products + tiers) as a new Draft
    duplicate: adminProcedure
      .input(z.object({ id: z.number(), newTitle: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const source = await getGroupBuyById(input.id);
        if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Buy not found" });
        const result = await createGroupBuy({
          title: input.newTitle,
          description: source.description ?? undefined,
          vendorName: source.vendorName ?? undefined,
          vendorCountry: source.vendorCountry ?? undefined,
          moqTarget: source.moqTarget ?? undefined,
          participantCap: source.participantCap ?? undefined,
          endDate: undefined,
          status: "Draft",
          createdBy: source.createdBy,
        });
        const newId = (result as any).insertId as number;
        // Copy products
        const sourceProducts = await getProductsByGroupBuy(input.id);
        await Promise.all(
          sourceProducts.map((p) =>
            createProduct({
              groupBuyId: newId,
              name: p.name,
              description: p.description ?? undefined,
              pricePerUnit: p.pricePerUnit,
              unit: p.unit,
              minQuantity: p.minQuantity,
              maxQuantity: p.maxQuantity ?? undefined,
            })
          )
        );
        // Copy tiers
        const sourceTiers = await getTiersByGroupBuy(input.id);
        await Promise.all(
          sourceTiers.map((t) =>
            createTier({
              groupBuyId: newId,
              name: t.name,
              minAmount: t.minAmount,
              description: t.description ?? undefined,
            })
          )
        );
        return { success: true, newId };
      }),
  }),

  // ─── Products ─────────────────────────────────────────────────────────────

  products: router({
    listByBuy: publicProcedure
      .input(z.object({ groupBuyId: z.number() }))
      .query(async ({ input }) => {
        return getProductsByGroupBuy(input.groupBuyId);
      }),

    create: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          vendorSkuId: z.number().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          pricePerUnit: z.string(),
          unit: z.string().default("vial"),
          minQuantity: z.number().default(1),
          maxQuantity: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createProduct(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          vendorSkuId: z.number().optional().nullable(),
          name: z.string().optional(),
          description: z.string().optional(),
          pricePerUnit: z.string().optional(),
          unit: z.string().optional(),
          minQuantity: z.number().optional(),
          maxQuantity: z.number().optional().nullable(),
          inStock: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, data);
        return { success: true };
      }),

        delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),
    bulkCreate: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          products: z.array(
            z.object({
              name: z.string().min(1),
              description: z.string().optional(),
              pricePerUnit: z.string(),
              unit: z.string().default("vial"),
              minQuantity: z.number().default(1),
              maxQuantity: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const rows = input.products.map((p) => ({
          groupBuyId: input.groupBuyId,
          name: p.name,
          description: p.description ?? null,
          pricePerUnit: p.pricePerUnit,
          unit: p.unit ?? "vial",
          minQuantity: p.minQuantity ?? 1,
          maxQuantity: p.maxQuantity ?? null,
          inStock: true as const,
        }));
        await bulkCreateProducts(rows);
        return { success: true, count: rows.length };
      }),
  }),
  // ─── Tiers ────────────────────────────────────────────────────────────────

  tiers: router({
    listByBuy: publicProcedure
      .input(z.object({ groupBuyId: z.number() }))
      .query(async ({ input }) => {
        return getTiersByGroupBuy(input.groupBuyId);
      }),

    create: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          name: z.string().min(1),
          minAmount: z.string(),
          description: z.string().optional(),
          sortOrder: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        await createTier(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          minAmount: z.string().optional(),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateTier(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTier(input.id);
        return { success: true };
      }),
  }),

  // ─── Orders ───────────────────────────────────────────────────────────────

  orders: router({
    listByBuy: adminProcedure
      .input(z.object({ groupBuyId: z.number() }))
      .query(async ({ input }) => {
        const orderList = await getOrdersByGroupBuy(input.groupBuyId);
        const enriched = await Promise.all(
          orderList.map(async (order) => {
            const [items, user] = await Promise.all([
              getOrderItems(order.id),
              getUserById(order.userId),
            ]);
            return { ...order, items, user };
          })
        );
        return enriched;
      }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const orderList = await getOrdersByUser(ctx.user.id);
      const enriched = await Promise.all(
        orderList.map(async (order) => {
          const [items, buy] = await Promise.all([
            getOrderItems(order.id),
            getGroupBuyById(order.groupBuyId),
          ]);
          const itemsWithProducts = await Promise.all(
            items.map(async (item) => ({
              ...item,
              product: await getProductById(item.productId),
            }))
          );
          return { ...order, items: itemsWithProducts, buy };
        })
      );
      return enriched;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await getOrderById(input.id);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const items = await getOrderItems(order.id);
        const itemsWithProducts = await Promise.all(
          items.map(async (item) => ({
            ...item,
            product: await getProductById(item.productId),
          }))
        );
        const buy = await getGroupBuyById(order.groupBuyId);
        return { ...order, items: itemsWithProducts, buy };
      }),

    create: protectedProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          tierId: z.number().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number().min(1),
            })
          ),
          memberNote: z.string().max(1000).optional(),
          shippingName: z.string().optional(),
          shippingAddress1: z.string().optional(),
          shippingAddress2: z.string().optional(),
          shippingCity: z.string().optional(),
          shippingState: z.string().optional(),
          shippingZip: z.string().optional(),
          shippingCountry: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if user already has an order for this buy
        const existing = await getUserOrderForGroupBuy(ctx.user.id, input.groupBuyId);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "You already have an order for this group buy." });
        }

        // Calculate total
        let totalAmount = 0;
        const itemsWithPrices: Array<{ productId: number; quantity: number; unitPrice: number; lineTotal: number }> = [];

        for (const item of input.items) {
          const product = await getProductById(item.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: `Product ${item.productId} not found` });
          if (!product.inStock) throw new TRPCError({ code: "BAD_REQUEST", message: `"${product.name}" is currently out of stock and cannot be ordered.` });
          const unitPrice = parseFloat(product.pricePerUnit as string);
          const lineTotal = unitPrice * item.quantity;
          totalAmount += lineTotal;
          itemsWithPrices.push({ productId: item.productId, quantity: item.quantity, unitPrice, lineTotal });
        }

        const orderId = await createOrder({
          userId: ctx.user.id,
          groupBuyId: input.groupBuyId,
          tierId: input.tierId,
          totalAmount: totalAmount.toFixed(2),
          status: "Committed",
          memberNote: input.memberNote ?? null,
          shippingName: input.shippingName,
          shippingAddress1: input.shippingAddress1,
          shippingAddress2: input.shippingAddress2,
          shippingCity: input.shippingCity,
          shippingState: input.shippingState,
          shippingZip: input.shippingZip,
          shippingCountry: input.shippingCountry,
        });

        for (const item of itemsWithPrices) {
          await createOrderItem({
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            lineTotal: item.lineTotal.toFixed(2),
          });
        }

        // GHL: fire order placed event (non-blocking)
        try {
          const user = await getUserById(ctx.user.id);
          const buy = await getGroupBuyById(input.groupBuyId);
          if (user?.email && buy) {
            const stats = await getUserOrderStats(ctx.user.id);
            ghlOnOrderPlaced({
              email: user.email,
              name: user.name,
              buyName: buy.title,
              orderTotal: totalAmount,
              orderId,
              totalOrders: stats.totalOrders,
              totalSpent: stats.totalSpent,
            }).catch((e) => console.error("[GHL] onOrderPlaced error:", e));
          }
        } catch (e) { console.error("[GHL] onOrderPlaced lookup error:", e); }

        return { success: true, orderId };
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["Committed", "Payment Pending", "Paid", "Shipped"]),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updates: Record<string, unknown> = { status: input.status };
        if (input.adminNotes !== undefined) updates.adminNotes = input.adminNotes;
        if (input.status === "Shipped") updates.shippedAt = new Date();
        await updateOrder(input.id, updates as any);

        // GHL: sync on status change
        try {
          const row = await getOrderWithUser(input.id);
          const user = row?.user;
          const order = row?.order;
          if (user?.email) {
            if (input.status === "Payment Pending") {
              // Fetch buy name for the opportunity title
              const buyName = (order as any)?.groupBuy?.title ?? "Group Buy";
              ghlOnPaymentPending({
                email: user.email,
                name: user.name,
                orderTotal: parseFloat(String(order?.totalAmount ?? 0)),
                buyName,
              }).catch((e) => console.error("[GHL] onPaymentPending error:", e));
            } else if (input.status === "Paid") {
              const stats = await getUserOrderStats(user.id);
              const buyName = (order as any)?.groupBuy?.title ?? "Group Buy";
              ghlOnPaymentReceived({
                email: user.email,
                name: user.name,
                orderTotal: parseFloat(String(order?.totalAmount ?? 0)),
                totalSpent: stats.totalSpent,
              }).catch((e) => console.error("[GHL] onPaymentReceived error:", e));
              // Fire payment-confirmed tag so GHL Workflow sends the confirmation email
              ghlOnPaymentConfirmed({
                email: user.email,
                name: user.name,
                buyName,
                amountPaid: parseFloat(String(order?.totalAmount ?? 0)),
              }).catch((e) => console.error("[GHL] onPaymentConfirmed error:", e));
            } else if (input.status === "Shipped") {
              ghlOnOrderShipped({
                email: user.email,
                name: user.name,
                trackingNumber: order?.trackingNumber ?? null,
                carrier: order?.trackingCarrier ?? null,
              }).catch((e) => console.error("[GHL] onOrderShipped error:", e));
            }
          }
        } catch (e) { console.error("[GHL] updateStatus GHL sync error:", e); }

        return { success: true };
      }),

    updateTracking: adminProcedure
      .input(
        z.object({
          id: z.number(),
          trackingNumber: z.string(),
          trackingCarrier: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateOrder(id, { ...data, status: "Shipped", shippedAt: new Date() });

        // GHL: tracking updated → shipped
        try {
          const row = await getOrderWithUser(id);
          if (row?.user?.email) {
            ghlOnOrderShipped({
              email: row.user.email,
              name: row.user.name,
              trackingNumber: input.trackingNumber,
              carrier: input.trackingCarrier ?? null,
            }).catch((e) => console.error("[GHL] onOrderShipped (tracking) error:", e));
          }
        } catch (e) { console.error("[GHL] updateTracking GHL sync error:", e); }

        return { success: true };
      }),

    bulkUpdateStatus: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          fromStatus: z.enum(["Committed", "Payment Pending", "Paid", "Shipped"]),
          toStatus: z.enum(["Committed", "Payment Pending", "Paid", "Shipped"]),
        })
      )
      .mutation(async ({ input }) => {
        const orderList = await getOrdersByGroupBuy(input.groupBuyId);
        const toUpdate = orderList.filter((o) => o.status === input.fromStatus);
        await Promise.all(toUpdate.map((o) => updateOrder(o.id, { status: input.toStatus })));
        return { success: true, updated: toUpdate.length };
      }),

    // Bulk import tracking numbers from CSV rows [{email, trackingNumber, carrier?}]
    bulkUpdateTracking: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          rows: z.array(
            z.object({
              email: z.string(),
              trackingNumber: z.string(),
              carrier: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const orderList = await getOrdersByGroupBuy(input.groupBuyId);
        // Build email → order map
        const emailMap = new Map<string, typeof orderList[0]>();
        for (const o of orderList) {
          if ((o as any).user?.email) emailMap.set((o as any).user.email.toLowerCase(), o);
        }
        let matched = 0;
        let unmatched: string[] = [];
        await Promise.all(
          input.rows.map(async (row) => {
            const order = emailMap.get(row.email.toLowerCase());
            if (!order) { unmatched.push(row.email); return; }
            await updateOrder(order.id, {
              trackingNumber: row.trackingNumber,
              trackingCarrier: row.carrier ?? null,
              status: "Shipped",
              shippedAt: new Date(),
            });
            matched++;
          })
        );
        return { success: true, matched, unmatched };
      }),
  }),

  // ─── Test Results ─────────────────────────────────────────────────────────

  testResults: router({
    listByBuy: publicProcedure
      .input(z.object({ groupBuyId: z.number() }))
      .query(async ({ input }) => {
        const results = await getTestResultsByGroupBuy(input.groupBuyId);
        // Only return published results to non-admins (handled on frontend via role check)
        return results;
      }),

    create: adminProcedure
      .input(
        z.object({
          groupBuyId: z.number(),
          productId: z.number().optional(),
          labName: z.string().default("Freedom Diagnostics"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createTestResult({
          ...input,
          status: "Pending",
          labName: input.labName || "Freedom Diagnostics",
        });
        return { success: true, id };
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["Pending", "Samples Sent", "In Testing", "Results Ready", "Published", "Failed"]),
          coaAccessionNumber: z.string().optional(),
          purityResult: z.string().optional(),
          identityConfirmed: z.boolean().optional(),
          sampleSentAt: z.string().optional(),
          resultReceivedAt: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, sampleSentAt, resultReceivedAt, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (sampleSentAt) updates.sampleSentAt = new Date(sampleSentAt);
        if (resultReceivedAt) updates.resultReceivedAt = new Date(resultReceivedAt);
        if (input.status === "Published") updates.publishedAt = new Date();

        await updateTestResult(id, updates as any);

        // Fire Skool webhook when results are published
        if (input.status === "Published") {
          const result = await getTestResultById(id);
          if (result) {
            await fireSkoolWebhook("test_results_posted", result.groupBuyId, {
              productId: result.productId,
              labName: result.labName,
              purityResult: result.purityResult,
            });
            // GHL: COA published — update all members of this buy
            try {
              const buyOrders = await getOrdersByGroupBuy(result.groupBuyId);
              for (const o of buyOrders) {
                const row = await getOrderWithUser(o.id);
                if (row?.user?.email) {
                  ghlOnCoaPublished({ email: row.user.email, name: row.user.name })
                    .catch((e) => console.error("[GHL] onCoaPublished error:", e));
                }
              }
            } catch (e) { console.error("[GHL] COA published GHL sync error:", e); }
          }
        }

        return { success: true };
      }),

    uploadCoa: adminProcedure
      .input(
        z.object({
          id: z.number(),
          fileName: z.string(),
          fileBase64: z.string(),
          mimeType: z.string().default("application/pdf"),
        })
      )
      .mutation(async ({ input }) => {
        const result = await getTestResultById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND" });

        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `coa/${result.groupBuyId}/${input.id}-${Date.now()}-${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);

        await updateTestResult(input.id, {
          coaFileKey: key,
          coaFileUrl: url,
          status: "Results Ready",
        });

        return { success: true, url };
      }),
  }),

  // ─── Skool Webhooks ───────────────────────────────────────────────────────

  skool: router({
    getConfig: adminProcedure.query(async () => {
      const config = await getSkoolWebhookConfig();
      return config ?? { id: null, webhookUrl: null, groupSlug: null, isActive: true, createdAt: null, updatedAt: null };
    }),

    saveConfig: adminProcedure
      .input(
        z.object({
          webhookUrl: z.string().url(),
          groupSlug: z.string().optional(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        await upsertSkoolWebhookConfig(input);
        return { success: true };
      }),

    getLogs: adminProcedure.query(async () => {
      return getSkoolWebhookLogs(100);
    }),

    testFire: adminProcedure
      .input(
        z.object({
          event: z.enum(["buy_live", "moq_reached", "test_results_posted", "orders_shipped"]),
          groupBuyId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await fireSkoolWebhook(input.event, input.groupBuyId ?? 0, { test: true });
        return { success: true };
      }),
  }),

  // ─── Invite Codes ────────────────────────────────────────────────────────────────

  inviteCodes: router({
    list: adminProcedure.query(async () => {
      return getAllInviteCodes();
    }),

    create: adminProcedure
      .input(
        z.object({
          label: z.string().optional(),
          maxUses: z.number().int().positive().optional(),
          expiresAt: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        await createInviteCode({
          code,
          label: input.label,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          createdBy: ctx.user.id,
        });
        return { success: true, code };
      }),

    revoke: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await revokeInviteCode(input.id);
        return { success: true };
      }),

    getUses: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getInviteCodeUses(input.id);
      }),

    myStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin" || ctx.user.role === "owner") return { onboarded: true };
      return { onboarded: await getUserInviteStatus(ctx.user.id) };
    }),

    redeem: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemInviteCode(input.code.trim().toUpperCase(), ctx.user.id);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });

        // GHL: invite redeemed
        try {
          const user = await getUserById(ctx.user.id);
          if (user?.email) {
            ghlOnInviteRedeemed({
              email: user.email,
              name: user.name,
              inviteCode: input.code.trim().toUpperCase(),
            }).catch((e) => console.error("[GHL] onInviteRedeemed error:", e));
          }
        } catch (e) { console.error("[GHL] invite redeem GHL sync error:", e); }

        return { success: true };
      }),
  }),

  // ─── GHL Admin ─────────────────────────────────────────────────────────────────

  ghl: router({
    getLogs: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getRecentGhlSyncLogs(input.limit ?? 20);
      }),

    resyncMember: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user || !user.email) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
        const stats = await getUserOrderStats(user.id);
        const lastOrder = stats.lastOrder;
        const result = await ghlResyncMember({
          email: user.email,
          name: user.name ?? null,
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          lastBuyName: lastOrder?.buyName ?? null,
          lastOrderStatus: lastOrder?.status ?? null,
          lastTrackingNumber: lastOrder?.trackingNumber ?? null,
          lastCarrier: lastOrder?.carrier ?? null,
          memberSince: user.createdAt.toISOString().split("T")[0],
        });
        await insertGhlSyncLog({
          direction: "outbound",
          eventType: "resync_member",
          email: user.email,
          userId: user.id,
          payload: JSON.stringify({ userId: user.id, contactId: result.contactId }),
          success: result.success,
        });
        return result;
      }),

    bulkResyncAllMembers: adminProcedure.mutation(async () => {
      const allUsers = await getAllUsers();
      const usersWithEmail = allUsers.filter((u) => !!u.email);
      let succeeded = 0;
      let failed = 0;
      await Promise.all(
        usersWithEmail.map(async (user) => {
          try {
            const stats = await getUserOrderStats(user.id);
            const lastOrder = stats.lastOrder;
            const result = await ghlResyncMember({
              email: user.email!,
              name: user.name ?? null,
              totalOrders: stats.totalOrders,
              totalSpent: stats.totalSpent,
              lastBuyName: lastOrder?.buyName ?? null,
              lastOrderStatus: lastOrder?.status ?? null,
              lastTrackingNumber: lastOrder?.trackingNumber ?? null,
              lastCarrier: lastOrder?.carrier ?? null,
              memberSince: user.createdAt.toISOString().split("T")[0],
            });
            await insertGhlSyncLog({
              direction: "outbound",
              eventType: "bulk_resync",
              email: user.email!,
              userId: user.id,
              payload: JSON.stringify({ userId: user.id, contactId: result.contactId }),
              success: result.success,
            });
            if (result.success) succeeded++; else failed++;
          } catch (e) {
            failed++;
            console.error(`[GHL] bulkResync error for user ${user.id}:`, e);
          }
        })
      );
      return { success: true, total: usersWithEmail.length, succeeded, failed };
    }),
  }),

  // ─── Order Notes ──────────────────────────────────────────────────────────────────────────────────

  orderNotes: router({
    /** Member saves their own note on their order. Editable while status is Committed or Payment Pending. */
    updateMemberNote: protectedProcedure
      .input(z.object({ orderId: z.number(), note: z.string().max(1000) }))
      .mutation(async ({ input, ctx }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
        if (order.status !== "Committed" && order.status !== "Payment Pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Notes can only be edited before payment is confirmed" });
        }
        await updateOrder(input.orderId, { memberNote: input.note } as any);
        // Sync to GHL non-blocking
        try {
          const row = await getOrderWithUser(input.orderId);
          if (row?.user?.email && input.note.trim()) {
            const { ghlUpsertContact } = await import("./ghl/service");
            const contact = await ghlUpsertContact({ email: row.user.email });
            if (contact?.id) {
              await ghlAddContactNote(contact.id, `Member Note: ${input.note.trim()}`);
            }
          }
        } catch (e) { console.error("[GHL] updateMemberNote GHL sync error:", e); }
        return { success: true };
      }),

    /** Admin saves a note on any order. Never visible to members. */
    updateAdminNote: adminProcedure
      .input(z.object({ orderId: z.number(), note: z.string().max(2000) }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        await updateOrder(input.orderId, { adminNotes: input.note } as any);
        // Sync to GHL non-blocking
        try {
          const row = await getOrderWithUser(input.orderId);
          if (row?.user?.email && input.note.trim()) {
            const { ghlUpsertContact } = await import("./ghl/service");
            const contact = await ghlUpsertContact({ email: row.user.email });
            if (contact?.id) {
              await ghlAddContactNote(contact.id, `Admin Note: ${input.note.trim()}`);
            }
          }
        } catch (e) { console.error("[GHL] updateAdminNote GHL sync error:", e); }
        return { success: true };
      }),
  }),

  // ─── Membership Requests ─────────────────────────────────────────────────────

  membership: router({
    /** Public: submit a membership access request */
    requestAccess: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(255),
        email: z.string().email(),
        skoolUsername: z.string().max(128).optional(),
        message: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        // Check for duplicate
        const existing = await getMembershipRequestByEmail(input.email);
        if (existing) {
          if (existing.status === "invite_sent") {
            return { success: true, alreadySent: true };
          }
          return { success: true, duplicate: true };
        }
        const id = await createMembershipRequest({
          name: input.name,
          email: input.email,
          skoolUsername: input.skoolUsername ?? null,
          message: input.message ?? null,
        });
        // Push to GHL non-blocking
        try {
          const ghlResult = await ghlOnAccessRequested({
            email: input.email,
            name: input.name,
            skoolUsername: input.skoolUsername ?? null,
          });
          if (ghlResult.contactId) {
            await updateMembershipRequest(id, { ghlContactId: ghlResult.contactId });
          }
          await insertGhlSyncLog({
            direction: "outbound",
            eventType: "access_request",
            email: input.email,
            payload: JSON.stringify({ name: input.name, skoolUsername: input.skoolUsername }),
            success: ghlResult.success,
          });
        } catch (e) { console.error("[GHL] requestAccess sync error:", e); }
        return { success: true };
      }),

    /** Admin: list all membership requests */
    listRequests: adminProcedure.query(async () => {
      return getAllMembershipRequests();
    }),

    /** Admin: manually create a member (generates invite code) */
    createMember: adminProcedure
      .input(z.object({
        name: z.string().min(2).max(255),
        email: z.string().email(),
        skoolUsername: z.string().max(128).optional(),
      }))
      .mutation(async ({ input }) => {
        // Generate a unique invite code
        const code = `PBG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const id = await createMembershipRequest({
          name: input.name,
          email: input.email,
          skoolUsername: input.skoolUsername ?? null,
          message: "Manually created by admin",
        });
        await updateMembershipRequest(id, { status: "invite_sent", inviteCode: code });
        // Create invite code in the invite_codes table
        await createInviteCode({
          code,
          label: `Admin-created for ${input.name} (${input.email})`,
          maxUses: 1,
          createdBy: 0, // system
        });
        // Push to GHL non-blocking
        try {
          const ghlResult = await ghlOnMemberApproved({
            email: input.email,
            name: input.name,
            inviteCode: code,
          });
          await insertGhlSyncLog({
            direction: "outbound",
            eventType: "admin_create_member",
            email: input.email,
            payload: JSON.stringify({ name: input.name, inviteCode: code }),
            success: ghlResult.success,
          });
        } catch (e) { console.error("[GHL] createMember GHL sync error:", e); }
        return { success: true, inviteCode: code };
      }),

    /** GHL Webhook: called when pbg-approved tag is applied in GHL */
    approveFromGhl: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        secret: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validate webhook secret
        const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
        if (webhookSecret && input.secret !== webhookSecret) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid webhook secret" });
        }
        // Find existing request or create one
        let req = await getMembershipRequestByEmail(input.email);
        if (!req) {
          const id = await createMembershipRequest({
            name: input.name ?? input.email,
            email: input.email,
          });
          req = (await getAllMembershipRequests()).find((r) => r.id === id) ?? null;
        }
        if (!req) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create request" });
        if (req.status === "invite_sent" && req.inviteCode) {
          return { success: true, inviteCode: req.inviteCode, alreadySent: true };
        }
        // Generate invite code
        const code = `PBG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await updateMembershipRequest(req.id, { status: "invite_sent", inviteCode: code });
        // Create invite code in the invite_codes table
        await createInviteCode({
          code,
          label: `GHL-approved for ${input.name ?? input.email}`,
          maxUses: 1,
          createdBy: 0,
        });
        // Push invite code back to GHL
        try {
          const ghlResult = await ghlOnMemberApproved({
            email: input.email,
            name: input.name ?? null,
            inviteCode: code,
          });
          await insertGhlSyncLog({
            direction: "outbound",
            eventType: "ghl_approved_invite_sent",
            email: input.email,
            payload: JSON.stringify({ inviteCode: code, contactId: ghlResult.contactId }),
            success: ghlResult.success,
          });
        } catch (e) { console.error("[GHL] approveFromGhl sync error:", e); }
        return { success: true, inviteCode: code };
      }),
  }),

    // ─── Vendors ──────────────────────────────────────────────────────────────────
  vendors: router({
    list: adminProcedure.query(async () => {
      return getAllVendors();
    }),
    listActive: publicProcedure.query(async () => {
      return getActiveVendors();
    }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const vendor = await getVendorById(input.id);
        if (!vendor) throw new TRPCError({ code: "NOT_FOUND" });
        return vendor;
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        country: z.string().length(2),
        website: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        whatsappNumber: z.string().optional(),
        notes: z.string().optional(),
        negotiatedDiscountPct: z.number().min(0).max(100).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createVendor({
          name: input.name,
          country: input.country,
          website: input.website ?? null,
          contactName: input.contactName ?? null,
          contactEmail: input.contactEmail ?? null,
          whatsappNumber: input.whatsappNumber ?? null,
          notes: input.notes ?? null,
          negotiatedDiscountPct: input.negotiatedDiscountPct != null ? String(input.negotiatedDiscountPct) as any : null,
          isActive: true,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        country: z.string().length(2).optional(),
        website: z.string().nullable().optional(),
        contactName: z.string().nullable().optional(),
        contactEmail: z.string().nullable().optional(),
        whatsappNumber: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        negotiatedDiscountPct: z.number().min(0).max(100).nullable().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, negotiatedDiscountPct, ...rest } = input;
        await updateVendor(id, {
          ...rest,
          ...(negotiatedDiscountPct !== undefined
            ? { negotiatedDiscountPct: negotiatedDiscountPct != null ? String(negotiatedDiscountPct) as any : null }
            : {}),
        });
        return { success: true };
      }),
    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deactivateVendor(input.id);
        return { success: true };
      }),
    // ─── SKUs ─────────────────────────────────────────────────────────────────
    listSkus: adminProcedure
      .input(z.object({ vendorId: z.number(), includeInactive: z.boolean().optional() }))
      .query(async ({ input }) => {
        return getSkusByVendor(input.vendorId, input.includeInactive ?? false);
      }),
    // Returns all active SKUs for a vendor, each with their full tier list.
    // Used by the Add Product dialog to show a searchable catalog with live tier pricing.
    listSkusWithTiers: adminProcedure
      .input(z.object({ vendorId: z.number() }))
      .query(async ({ input }) => {
        return getSkusWithTiersForVendor(input.vendorId);
      }),
    getSku: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sku = await getSkuById(input.id);
        if (!sku) throw new TRPCError({ code: "NOT_FOUND" });
        return sku;
      }),
    createSku: adminProcedure
      .input(z.object({
        vendorId: z.number(),
        skuCode: z.string().min(1),
        name: z.string().min(1),
        productLine: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        currentPrice: z.string(),
        minQuantity: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createSku({
          vendorId: input.vendorId,
          skuCode: input.skuCode,
          name: input.name,
          productLine: input.productLine ?? null,
          description: input.description ?? null,
          unit: input.unit ?? "vial",
          currentPrice: input.currentPrice as any,
          minQuantity: input.minQuantity ?? 1,
          isActive: true,
        });
        // Write baseline price history
        const { skuPriceHistory: sph, vendorSkus: vs } = await import("../drizzle/schema");
        const db = await (await import("./db")).getDb();
        if (db) {
          await db.insert(sph).values({ vendorSkuId: id, price: input.currentPrice as any, source: "manual", recordedBy: ctx.user.id });
        }
        return { id };
      }),
    updateSku: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        alias: z.string().max(128).nullable().optional(),
        productLine: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        unit: z.string().optional(),
        currentPrice: z.string().optional(),
        minQuantity: z.number().int().min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, currentPrice, ...rest } = input;
        if (currentPrice !== undefined) {
          await recordManualPriceChange(id, currentPrice, ctx.user.id);
        } else {
          await updateSku(id, rest as any);
        }
        return { success: true };
      }),
    deactivateSku: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deactivateSku(input.id);
        return { success: true };
      }),
    // ─── Price List Import ────────────────────────────────────────────────────
    importPriceList: adminProcedure
      .input(z.object({
        vendorId: z.number(),
        rows: z.array(z.object({
          skuCode: z.string().min(1),
          name: z.string().min(1),
          currentPrice: z.string(),
          productLine: z.string().optional(),
          description: z.string().optional(),
          unit: z.string().optional(),
          minQuantity: z.number().int().min(1).optional(),
          // Optional price tiers: [{minQty, price}]
          tiers: z.array(z.object({ minQty: z.number().int().min(1), price: z.string() })).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        let added = 0;
        let updated = 0;
        let priceChanges = 0;
        for (const row of input.rows) {
          const { priceChanged, skuId } = await upsertVendorSku(
            {
              vendorId: input.vendorId,
              skuCode: row.skuCode,
              name: row.name,
              currentPrice: row.currentPrice as any,
              productLine: row.productLine ?? null,
              description: row.description ?? null,
              unit: row.unit ?? "vial",
              minQuantity: row.minQuantity ?? 1,
              isActive: true,
            },
            ctx.user.id
          );
          // Upsert price tiers if provided
          if (row.tiers && row.tiers.length > 0) {
            await upsertSkuTiers(skuId, row.tiers);
          }
          const existing = await getSkuById(skuId);
          if (!existing) added++;
          else updated++;
          if (priceChanged) priceChanges++;
        }
        return { added, updated, priceChanges, total: input.rows.length };
      }),
    // ─── Global SKU Export / Import ──────────────────────────────────────────
    exportAllSkus: adminProcedure
      .query(async () => {
        return exportAllSkus();
      }),

    bulkUpsertSkus: adminProcedure
      .input(z.object({
        rows: z.array(z.object({
          vendorName: z.string().min(1),
          skuCode: z.string().min(1),
          name: z.string().min(1),
          alias: z.string().nullable().optional(),
          productLine: z.string().nullable().optional(),
          unit: z.string().optional(),
          currentPrice: z.string(),
          minQuantity: z.number().int().min(1).optional(),
          isActive: z.boolean().optional(),
          tier1Qty: z.number().int().nullable().optional(),
          tier1Price: z.string().nullable().optional(),
          tier2Qty: z.number().int().nullable().optional(),
          tier2Price: z.string().nullable().optional(),
          tier3Qty: z.number().int().nullable().optional(),
          tier3Price: z.string().nullable().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        let added = 0;
        let updated = 0;
        let priceChanges = 0;
        let skipped = 0;

        // Build vendor name → id map once
        const allVendors = await getAllVendors();
        const vendorMap = new Map(allVendors.map((v) => [v.name.toLowerCase().trim(), v.id]));

        for (const row of input.rows) {
          const vendorId = vendorMap.get(row.vendorName.toLowerCase().trim());
          if (!vendorId) { skipped++; continue; }

          const { priceChanged, skuId } = await upsertVendorSku(
            {
              vendorId,
              skuCode: row.skuCode,
              name: row.name,
              currentPrice: row.currentPrice as any,
              productLine: row.productLine ?? null,
              unit: row.unit ?? "vial",
              minQuantity: row.minQuantity ?? 1,
              isActive: row.isActive !== false,
            },
            ctx.user.id
          );

          // Update alias separately (upsertVendorSku doesn't handle it)
          if (row.alias !== undefined) {
            await updateSku(skuId, { alias: row.alias ?? null } as any);
          }

          // Rebuild tiers from the 3 tier columns
          const tiers: Array<{ minQty: number; price: string }> = [];
          if (row.tier1Qty && row.tier1Price) tiers.push({ minQty: row.tier1Qty, price: row.tier1Price });
          if (row.tier2Qty && row.tier2Price) tiers.push({ minQty: row.tier2Qty, price: row.tier2Price });
          if (row.tier3Qty && row.tier3Price) tiers.push({ minQty: row.tier3Qty, price: row.tier3Price });
          if (tiers.length > 0) await upsertSkuTiers(skuId, tiers);

          if (priceChanged) priceChanges++;
          // Determine if new or updated by checking if it existed before
          const wasNew = !priceChanged && (await getSkuById(skuId))?.name === row.name;
          if (wasNew) updated++; else added++;
        }
        return { added, updated, priceChanges, skipped, total: input.rows.length };
      }),

    // ─── SKU Price Tiers ─────────────────────────────────────────────────────
    listSkuTiers: adminProcedure
      .input(z.object({ vendorSkuId: z.number() }))
      .query(async ({ input }) => {
        return getTiersBySkuId(input.vendorSkuId);
      }),
    upsertSkuTiers: adminProcedure
      .input(z.object({
        vendorSkuId: z.number(),
        tiers: z.array(z.object({ minQty: z.number().int().min(1), price: z.string() })),
      }))
      .mutation(async ({ input }) => {
        await upsertSkuTiers(input.vendorSkuId, input.tiers);
        return { success: true };
      }),
    calcEffectivePrice: adminProcedure
      .input(z.object({ vendorSkuId: z.number(), qty: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const sku = await getSkuById(input.vendorSkuId);
        if (!sku) throw new TRPCError({ code: "NOT_FOUND" });
        const vendor = await getVendorById(sku.vendorId);
        const tiers = await getTiersBySkuId(input.vendorSkuId);
        return calcEffectivePrice(sku.currentPrice as string, tiers, input.qty, vendor?.negotiatedDiscountPct as string | null);
      }),
    // ─── Price History ────────────────────────────────────────────────────────
    priceHistory: adminProcedure
      .input(z.object({ vendorSkuId: z.number() }))
      .query(async ({ input }) => {
        return getPriceHistoryBySku(input.vendorSkuId);
      }),
    // ─── Ratings ─────────────────────────────────────────────────────────────
    ratings: adminProcedure
      .input(z.object({ vendorId: z.number() }))
      .query(async ({ input }) => {
        return getVendorRatings(input.vendorId);
      }),
    ratingSummary: adminProcedure
      .input(z.object({ vendorId: z.number() }))
      .query(async ({ input }) => {
        return getVendorRatingSummary(input.vendorId);
      }),
    rate: adminProcedure
      .input(z.object({
        vendorId: z.number(),
        groupBuyId: z.number(),
        qualityScore: z.number().int().min(1).max(5),
        commScore: z.number().int().min(1).max(5),
        speedScore: z.number().int().min(1).max(5),
        packagingScore: z.number().int().min(1).max(5),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verified-buy guard: admin must have managed this buy
        const buy = await getGroupBuyById(input.groupBuyId);
        if (!buy) throw new TRPCError({ code: "NOT_FOUND", message: "Buy not found" });
        if ((buy as any).vendorId !== input.vendorId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This buy was not with this vendor" });
        }
        await upsertVendorRating({
          vendorId: input.vendorId,
          userId: ctx.user.id,
          groupBuyId: input.groupBuyId,
          qualityScore: input.qualityScore,
          commScore: input.commScore,
          speedScore: input.speedScore,
          packagingScore: input.packagingScore,
          notes: input.notes ?? null,
        });
        return { success: true };
      }),

    // ── SKU COA procedures ────────────────────────────────────────────────────
    uploadSkuCoa: adminProcedure
      .input(z.object({
        vendorSkuId: z.number(),
        filename: z.string(),
        fileBase64: z.string(), // base64-encoded file bytes
        mimeType: z.string().default("application/pdf"),
        labName: z.string().optional(),
        purityPct: z.string().optional(), // decimal string e.g. "98.50"
        testedAt: z.string().optional(),  // ISO date string
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `vendor-coas/${input.vendorSkuId}/${Date.now()}-${input.filename}`;
        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);
        const id = await insertSkuCoa({
          vendorSkuId: input.vendorSkuId,
          filename: input.filename,
          fileKey: key,
          fileUrl: url,
          labName: input.labName ?? null,
          purityPct: input.purityPct ? (input.purityPct as any) : null,
          testedAt: input.testedAt ? new Date(input.testedAt) : null,
          notes: input.notes ?? null,
          uploadedBy: ctx.user.id,
        });
        return { success: true, id, fileUrl: url };
      }),

    listSkuCoas: adminProcedure
      .input(z.object({ vendorSkuId: z.number() }))
      .query(async ({ input }) => {
        return listSkuCoas(input.vendorSkuId);
      }),

    deleteSkuCoa: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSkuCoa(input.id);
        return { success: true };
      }),

    getLatestSkuPurity: adminProcedure
      .input(z.object({ vendorSkuId: z.number() }))
      .query(async ({ input }) => {
        return getLatestSkuPurity(input.vendorSkuId);
      }),

    // ── Price Finder ─────────────────────────────────────────────────────────
    searchSkus: adminProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return searchSkusAcrossVendors(input.query);
      }),
  }),
  // ─── Reporting ────────────────────────────────────────────────────────────────
  reporting: router({
    buyReport: adminProcedure
      .input(z.object({ groupBuyId: z.number() }))
      .query(async ({ input }) => {
        return getAdminReportData(input.groupBuyId);
      }),

    allBuysSummary: adminProcedure.query(async () => {
      const buys = await getAllGroupBuys();
      const summaries = await Promise.all(
        buys.map(async (buy) => {
          const stats = await getGroupBuyStats(buy.id);
          return { buy, stats };
        })
      );
      return summaries;
    }),
  }),
});

export type AppRouter = typeof appRouter;
