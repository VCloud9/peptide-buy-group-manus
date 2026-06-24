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
} from "./db";
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
          vendorName: z.string().optional(),
          vendorCountry: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createGroupBuy({
          ...input,
          moqTarget: input.moqTarget,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          createdBy: ctx.user.id,
          status: "Draft",
        });
        return { success: true };
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

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGroupBuy(input.id);
        return { success: true };
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
      return getSkoolWebhookConfig();
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

  // ─── Reporting ────────────────────────────────────────────────────────────

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
