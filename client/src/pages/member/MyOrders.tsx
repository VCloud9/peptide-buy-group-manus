import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronDown, ChevronRight, Copy, CreditCard, ExternalLink, MessageSquare, Package, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── Payment Instructions Modal ───────────────────────────────────────────────

const ZELLE_HANDLE = "ray@vcloud9.com";
const VENMO_HANDLE = "@ray-collazo";

function PaymentInstructionsModal({
  open,
  onClose,
  amount,
  buyTitle,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  buyTitle: string;
}) {
  const [copiedZelle, setCopiedZelle] = useState(false);
  const [copiedVenmo, setCopiedVenmo] = useState(false);

  function copy(text: string, which: "zelle" | "venmo") {
    navigator.clipboard.writeText(text);
    if (which === "zelle") {
      setCopiedZelle(true);
      setTimeout(() => setCopiedZelle(false), 2000);
    } else {
      setCopiedVenmo(true);
      setTimeout(() => setCopiedVenmo(false), 2000);
    }
    toast.success("Copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard size={18} className="text-primary" />
            Payment Instructions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Amount callout */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Amount Due</p>
            <p className="text-3xl font-bold text-primary tabular-nums">${amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground truncate">{buyTitle}</p>
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Send the exact amount above using either <strong>Zelle</strong> or <strong>Venmo</strong>.
            Include your <strong>name</strong> and the <strong>buy name</strong> in the payment note so we can match it to your order.
          </p>

          {/* Zelle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#6D1ED4]/15 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#6D1ED4]">Z</span>
              </div>
              <p className="text-sm font-semibold">Zelle</p>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5 border border-border/60">
              <code className="flex-1 text-sm font-mono text-foreground">{ZELLE_HANDLE}</code>
              <button
                onClick={() => copy(ZELLE_HANDLE, "zelle")}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy Zelle handle"
              >
                {copiedZelle ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Venmo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#008CFF]/15 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#008CFF]">V</span>
              </div>
              <p className="text-sm font-semibold">Venmo</p>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5 border border-border/60">
              <code className="flex-1 text-sm font-mono text-foreground">{VENMO_HANDLE}</code>
              <button
                onClick={() => copy(VENMO_HANDLE, "venmo")}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy Venmo handle"
              >
                {copiedVenmo ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Note reminder */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-400">Important — include in your payment note:</p>
            <p className="text-xs text-muted-foreground">
              Your full name + the buy name (e.g., <em>"John Smith — BPC-157 Round 3"</em>)
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Once payment is confirmed, your order status will update to <strong>Paid</strong> within 24 hours.
          </p>

          <Button className="w-full" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState<string>(order.memberNote ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const total = parseFloat(order.totalAmount as string);
  const canEditNote = order.status === "Committed" || order.status === "Payment Pending";
  const isPaymentPending = order.status === "Payment Pending";
  const utils = trpc.useUtils();

  const saveNote = trpc.orderNotes.updateMemberNote.useMutation({
    onSuccess: () => {
      toast.success("Note saved");
      setEditingNote(false);
      utils.orders.myOrders.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PaymentInstructionsModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        amount={total}
        buyTitle={order.buy?.title ?? "Group Buy"}
      />

      <div className={`glass-card overflow-hidden ${isPaymentPending ? "ring-1 ring-amber-500/40" : ""}`}>
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
            {order.memberNote && (
              <MessageSquare size={13} className="text-primary/60" aria-label="Has note" />
            )}
            {isPaymentPending && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                <CreditCard size={12} />
                Payment due
              </span>
            )}
            <StatusBadge status={order.status} type="order" />
            {expanded ? <ChevronDown size={15} className="text-muted-foreground" /> : <ChevronRight size={15} className="text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border p-4 space-y-4">

            {/* Payment Pending Banner */}
            {isPaymentPending && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <CreditCard size={14} />
                    Payment Required
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your order is reserved. Send <strong className="text-foreground">${total.toFixed(2)}</strong> via Zelle or Venmo to confirm your spot.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0"
                  onClick={() => setPayModalOpen(true)}
                >
                  <CreditCard size={13} className="mr-1.5" />
                  How to Pay
                </Button>
              </div>
            )}

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

            {/* Member Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Note
                </p>
                {canEditNote && !editingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setEditingNote(true)}
                  >
                    {note ? "Edit" : "Add note"}
                  </Button>
                )}
              </div>
              {editingNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note for the admin (e.g., special shipping instructions)..."
                    className="text-sm resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => saveNote.mutate({ orderId: order.id, note })}
                      disabled={saveNote.isPending}
                    >
                      <Save size={12} className="mr-1" />
                      {saveNote.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setNote(order.memberNote ?? ""); setEditingNote(false); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : note ? (
                <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border/50">
                  {note}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">
                  {canEditNote ? "No note added yet." : "No note."}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/buys/${order.groupBuyId}`}>View Buy Details</Link>
              </Button>
              {isPaymentPending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                  onClick={() => setPayModalOpen(true)}
                >
                  <CreditCard size={13} className="mr-1.5" />
                  Payment Instructions
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyOrders() {
  const { data: orders, isLoading } = trpc.orders.myOrders.useQuery();

  const pendingCount = orders?.filter((o) => o.status === "Payment Pending").length ?? 0;

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your commitments, payments, and shipments
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium shrink-0">
              <CreditCard size={12} />
              {pendingCount} payment{pendingCount > 1 ? "s" : ""} due
            </div>
          )}
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
