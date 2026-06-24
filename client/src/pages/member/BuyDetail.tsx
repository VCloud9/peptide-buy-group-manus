import { AppLayout } from "@/components/AppLayout";
import { MoqProgress } from "@/components/MoqProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  Download,
  ExternalLink,
  FlaskConical,
  Minus,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function BuyDetail() {
  const { id } = useParams<{ id: string }>();
  const buyId = parseInt(id ?? "0");
  const { user } = useAuth();

  const { data, isLoading, refetch } = trpc.groupBuys.getWithDetails.useQuery({ id: buyId });
  const { data: myOrders } = trpc.orders.myOrders.useQuery();
  const { data: testResults } = trpc.testResults.listByBuy.useQuery({ groupBuyId: buyId });
  const { data: meProfile } = trpc.users.me.useQuery();

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Order committed successfully!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const existingOrder = myOrders?.find((o) => o.groupBuyId === buyId);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-8 space-y-4">
          <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
          <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="container py-16 text-center text-muted-foreground">Buy not found.</div>
      </AppLayout>
    );
  }

  const { buy, products, tiers, stats } = data;
  const canOrder = buy.status === "Gathering" && !existingOrder;

  const orderTotal = products.reduce((sum, p) => {
    const qty = quantities[p.id] ?? 0;
    return sum + qty * parseFloat(p.pricePerUnit as string);
  }, 0);

  const publishedCoas = testResults?.filter((r) => r.status === "Published") ?? [];

  const handleSubmit = async () => {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId: parseInt(productId), quantity }));

    if (items.length === 0) {
      toast.error("Please add at least one product to your order.");
      return;
    }

    setSubmitting(true);
    try {
      await createOrder.mutateAsync({
        groupBuyId: buyId,
        tierId: selectedTier ?? undefined,
        items,
        shippingName: meProfile?.shippingName ?? undefined,
        shippingAddress1: meProfile?.shippingAddress1 ?? undefined,
        shippingAddress2: meProfile?.shippingAddress2 ?? undefined,
        shippingCity: meProfile?.shippingCity ?? undefined,
        shippingState: meProfile?.shippingState ?? undefined,
        shippingZip: meProfile?.shippingZip ?? undefined,
        shippingCountry: meProfile?.shippingCountry ?? undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
          <Link href="/buys">
            <ChevronLeft size={16} className="mr-1" /> Back to Buys
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{buy.title}</h1>
              <StatusBadge status={buy.status} type="buy" />
            </div>
            {buy.description && (
              <p className="text-muted-foreground text-sm max-w-2xl">{buy.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {buy.vendorName && <span>Vendor: {buy.vendorName}</span>}
              {buy.vendorCountry && <span>Origin: {buy.vendorCountry}</span>}
              {buy.endDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> Closes {new Date(buy.endDate).toLocaleDateString()}
                </span>
              )}
              {buy.participantCap && (
                <span className="flex items-center gap-1">
                  <Users size={11} /> Cap: {buy.participantCap} participants
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MOQ Progress */}
        <div className="glass-card p-5">
          <MoqProgress
            current={stats.totalCommitted}
            target={parseFloat(buy.moqTarget as string)}
          />
          <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
            <span>{stats.participantCount} participant(s)</span>
            <span>{stats.paidCount} paid</span>
            <span>${stats.totalPaid.toFixed(2)} collected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Products
            </h2>
            {products.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                No products listed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const qty = quantities[product.id] ?? 0;
                  const outOfStock = !product.inStock;
                  return (
                    <div key={product.id} className={`glass-card p-4 flex items-center gap-4 ${outOfStock ? "opacity-50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{product.name}</p>
                          {outOfStock && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                              Unavailable
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          ${parseFloat(product.pricePerUnit as string).toFixed(2)} / {product.unit}
                          {product.minQuantity > 1 && ` · Min: ${product.minQuantity}`}
                          {product.maxQuantity && ` · Max: ${product.maxQuantity}`}
                        </p>
                      </div>
                      {canOrder && !outOfStock && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [product.id]: Math.max(0, (q[product.id] ?? 0) - 1),
                              }))
                            }
                            className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums font-medium">{qty}</span>
                          <button
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [product.id]: (q[product.id] ?? 0) + 1,
                              }))
                            }
                            className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          {qty > 0 && (
                            <span className="text-xs text-primary font-semibold w-16 text-right tabular-nums">
                              ${(qty * parseFloat(product.pricePerUnit as string)).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Published COAs */}
            {publishedCoas.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  Lab Results — Freedom Diagnostics
                </h2>
                {publishedCoas.map((result) => {
                  const prod = products.find((p) => p.id === result.productId);
                  return (
                    <div key={result.id} className="glass-card p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {prod?.name ?? "Batch"} — HPLC/LC-MS COA
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          {result.purityResult && <span>Purity: {result.purityResult}</span>}
                          {result.identityConfirmed && <span className="text-primary">Identity Confirmed ✓</span>}
                          {result.coaAccessionNumber && <span>#{result.coaAccessionNumber}</span>}
                        </div>
                      </div>
                      {result.coaFileUrl && (
                        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
                          <a href={result.coaFileUrl} target="_blank" rel="noopener noreferrer">
                            <Download size={13} /> COA PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: Tiers + Order Summary */}
          <div className="space-y-4">
            {/* Participation Tiers */}
            {tiers.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Participation Tiers</h3>
                {tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => canOrder && setSelectedTier(tier.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all text-sm",
                      selectedTier === tier.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/20 hover:border-primary/40"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{tier.name}</span>
                      <span className="text-primary font-semibold text-xs">
                        Min ${parseFloat(tier.minAmount as string).toFixed(0)}
                      </span>
                    </div>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Order Summary */}
            {canOrder && (
              <div className="glass-card p-4 space-y-4">
                <h3 className="font-semibold text-sm">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {products
                    .filter((p) => (quantities[p.id] ?? 0) > 0)
                    .map((p) => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {p.name} × {quantities[p.id]}
                        </span>
                        <span className="tabular-nums">
                          ${((quantities[p.id] ?? 0) * parseFloat(p.pricePerUnit as string)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary tabular-nums">${orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {!meProfile?.shippingAddress1 && (
                  <p className="text-xs text-accent bg-accent/10 border border-accent/30 rounded-md p-2">
                    No shipping address on file.{" "}
                    <Link href="/profile" className="underline">Add one in your profile</Link>.
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting || orderTotal === 0}
                >
                  {submitting ? "Submitting..." : "Commit to Order"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Committing does not charge you. Payment instructions will follow.
                </p>
              </div>
            )}

            {/* Existing order */}
            {existingOrder && (
              <div className="glass-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Your Order</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={existingOrder.status} type="order" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">
                    ${parseFloat(existingOrder.totalAmount as string).toFixed(2)}
                  </span>
                </div>
                {existingOrder.trackingNumber && (
                  <div className="text-xs text-muted-foreground">
                    Tracking: {existingOrder.trackingNumber}
                  </div>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/my-orders">View in My Orders</Link>
                </Button>
              </div>
            )}

            {/* Buy closed */}
            {buy.status !== "Gathering" && !existingOrder && (
              <div className="glass-card p-4 text-center text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Not accepting commitments</p>
                <p className="text-xs">This buy is currently in <strong>{buy.status}</strong> status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
