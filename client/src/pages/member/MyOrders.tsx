import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, ExternalLink, Package } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const total = parseFloat(order.totalAmount as string);

  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package size={15} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{order.buy?.title ?? "Group Buy"}</p>
            <p className="text-xs text-muted-foreground">
              {order.items?.length ?? 0} item(s) &middot; ${total.toFixed(2)} &middot;{" "}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={order.status} type="order" />
          {expanded ? <ChevronDown size={15} className="text-muted-foreground" /> : <ChevronRight size={15} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Items</p>
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

          {/* Shipping */}
          {order.shippingAddress1 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shipping Address</p>
              <p className="text-sm text-muted-foreground">
                {order.shippingName && <span className="block">{order.shippingName}</span>}
                {order.shippingAddress1}
                {order.shippingAddress2 && `, ${order.shippingAddress2}`}
                <br />
                {order.shippingCity}, {order.shippingState} {order.shippingZip}
                {order.shippingCountry && `, ${order.shippingCountry}`}
              </p>
            </div>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tracking</p>
              <p className="text-sm font-mono text-primary">
                {order.trackingCarrier && <span className="text-muted-foreground mr-2">{order.trackingCarrier}</span>}
                {order.trackingNumber}
              </p>
              {order.shippedAt && (
                <p className="text-xs text-muted-foreground">
                  Shipped {new Date(order.shippedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Status progression */}
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

          <Button asChild variant="outline" size="sm">
            <Link href={`/buys/${order.groupBuyId}`}>View Buy Details</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyOrders() {
  const { data: orders, isLoading } = trpc.orders.myOrders.useQuery();

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your commitments, payments, and shipments
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-3">
            <Package size={40} className="mx-auto text-muted-foreground/40" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">
              Browse active buys and place your first commitment.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/buys">Browse Buys</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
