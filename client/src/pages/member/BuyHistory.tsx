import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { BuyStatus } from "../../../../shared/types";
import { ChevronDown, ChevronRight, ExternalLink, FlaskConical, Package, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

// Group orders by buy, enriched with test results
function BuyHistoryCard({ buyId, buyTitle, buyStatus, orders, testResults }: {
  buyId: number;
  buyTitle: string;
  buyStatus: string;
  orders: any[];
  testResults: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const order = orders[0]; // one order per buy per member
  const total = order ? parseFloat(order.totalAmount as string) : 0;
  const publishedResults = testResults.filter((r) => r.status === "Published");

  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{buyTitle}</p>
            <p className="text-xs text-muted-foreground">
              {order ? (
                <>
                  {order.items?.length ?? 0} item(s) &middot; ${total.toFixed(2)} &middot;{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </>
              ) : (
                "No order placed"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={buyStatus as BuyStatus} type="buy" />
          {order && <StatusBadge status={order.status} type="order" />}
          {expanded ? (
            <ChevronDown size={15} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={15} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-5">
          {order ? (
            <>
              {/* Order items */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Order</p>
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.product?.name ?? `Product #${item.productId}`} × {item.quantity}
                    </span>
                    <span className="tabular-nums">${parseFloat(item.lineTotal as string).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment status */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["Committed", "Payment Pending", "Paid", "Shipped"] as const).map((s, i, arr) => (
                    <div key={s} className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          order.status === s
                            ? "border-primary text-primary bg-primary/10 font-semibold"
                            : ["Committed", "Payment Pending", "Paid", "Shipped"].indexOf(order.status) >
                              ["Committed", "Payment Pending", "Paid", "Shipped"].indexOf(s)
                            ? "border-primary/30 text-primary/50"
                            : "border-border text-muted-foreground/50"
                        }`}
                      >
                        {s}
                      </span>
                      {i < arr.length - 1 && <ChevronRight size={12} className="text-muted-foreground/40" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking */}
              {order.trackingNumber && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck size={12} /> Tracking
                  </p>
                  <p className="text-sm font-mono text-primary">
                    {order.trackingCarrier && (
                      <span className="text-muted-foreground mr-2 font-sans">{order.trackingCarrier}</span>
                    )}
                    {order.trackingNumber}
                  </p>
                  {order.shippedAt && (
                    <p className="text-xs text-muted-foreground">
                      Shipped {new Date(order.shippedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">You did not place an order in this buy.</p>
          )}

          {/* COA / Test Results */}
          {publishedResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FlaskConical size={12} /> Lab Test Results
              </p>
              <div className="space-y-2">
                {publishedResults.map((result: any) => (
                  <div key={result.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">
                        {result.labName ?? "Freedom Diagnostics"}
                        {result.purityResult && (
                          <span className="ml-2 text-accent">{result.purityResult} purity</span>
                        )}
                      </p>
                      {result.identityConfirmed !== null && (
                        <p className="text-xs text-muted-foreground">
                          Identity: {result.identityConfirmed ? "Confirmed ✓" : "Not confirmed"}
                        </p>
                      )}
                      {result.publishedAt && (
                        <p className="text-xs text-muted-foreground">
                          Published {new Date(result.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {result.coaFileUrl && (
                      <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs h-7">
                        <a href={result.coaFileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={11} /> COA PDF
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button asChild variant="outline" size="sm">
            <Link href={`/buys/${buyId}`}>View Buy Details</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BuyHistory() {
  const { data: orders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery();
  const { data: allBuys, isLoading: buysLoading } = trpc.groupBuys.listActive.useQuery();

  // Build a map of buyId → test results from the active buys list
  // We'll fetch test results per buy that the member has ordered
  const orderedBuyIds = useMemo(
    () => Array.from(new Set((orders ?? []).map((o: any) => o.groupBuyId as number))),
    [orders]
  );

  // Fetch test results for each buy the member ordered
  const testResultsQueries = trpc.useQueries((t) =>
    orderedBuyIds.map((id) => t.testResults.listByBuy({ groupBuyId: id }))
  );

  const isLoading = ordersLoading || buysLoading;

  // Build enriched buy history list
  const buyHistory = useMemo(() => {
    if (!orders) return [];

    // Group orders by buyId
    const ordersByBuy = new Map<number, any[]>();
    for (const order of orders) {
      const existing = ordersByBuy.get(order.groupBuyId) ?? [];
      existing.push(order);
      ordersByBuy.set(order.groupBuyId, existing);
    }

    return Array.from(ordersByBuy.entries()).map(([buyId, buyOrders], idx) => {
      const buy = buyOrders[0]?.buy;
      const testResults = testResultsQueries[idx]?.data ?? [];
      return {
        buyId,
        buyTitle: buy?.title ?? `Group Buy #${buyId}`,
        buyStatus: buy?.status ?? "Unknown",
        orders: buyOrders,
        testResults,
      };
    });
  }, [orders, testResultsQueries]);

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Buy History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All group buys you've participated in, with lab results and tracking
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : buyHistory.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-3">
            <FlaskConical size={40} className="mx-auto text-muted-foreground/40" />
            <p className="font-medium">No buy history yet</p>
            <p className="text-sm text-muted-foreground">
              Once you place an order in a group buy, it will appear here.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/buys">Browse Active Buys</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {buyHistory.map((entry) => (
              <BuyHistoryCard key={entry.buyId} {...entry} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
