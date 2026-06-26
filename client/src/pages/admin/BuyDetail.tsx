import { AppLayout } from "@/components/AppLayout";
import { ImportProductsDialog } from "@/components/ImportProductsDialog";
import BulkTrackingImportDialog from "@/components/BulkTrackingImportDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle, ChevronLeft, Download, FileDown, FlaskConical, MessageSquare, Package, Pencil, Plus, Save, ShieldCheck, Star, Trash2, Upload, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import type { BuyStatus, OrderStatus, TestStatus } from "../../../../shared/types";

const BUY_STATUSES: BuyStatus[] = ["Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete"];
const ORDER_STATUSES: OrderStatus[] = ["Committed", "Payment Pending", "Paid", "Shipped"];
const TEST_STATUSES: TestStatus[] = ["Pending", "Samples Sent", "In Testing", "Results Ready", "Published", "Failed"];

// ─── OrderRow ─────────────────────────────────────────────────────────────────
function OrderRow({
  order,
  onStatusChange,
  onTrackClick,
  onSaveAdminNote,
  onMarkPaid,
  isMarkingPaid,
}: {
  order: any;
  onStatusChange: (v: string) => void;
  onTrackClick: () => void;
  onSaveAdminNote: (note: string) => void;
  onMarkPaid: () => void;
  isMarkingPaid: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [adminNote, setAdminNote] = useState<string>(order.adminNotes ?? "");

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{order.user?.name ?? order.user?.email ?? `User #${order.userId}`}</p>
          <p className="text-xs text-muted-foreground">
            ${parseFloat(order.totalAmount as string).toFixed(2)} &middot; {order.items?.length ?? 0} item(s)
            {order.trackingNumber && ` · Track: ${order.trackingNumber}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={order.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {order.status === "Payment Pending" && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={onMarkPaid}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? (
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle size={11} />
              )}
              Mark Paid
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onTrackClick}>
            <Package size={11} /> Track
          </Button>
          <Button
            variant="ghost" size="sm"
            className={`h-7 text-xs gap-1 ${adminNote ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setNoteOpen((o) => !o)}
          >
            <MessageSquare size={11} />
          </Button>
        </div>
      </div>
      {/* Items preview */}
      <div className="flex flex-wrap gap-1">
        {order.items?.map((item: any) => (
          <span key={item.id} className="text-xs bg-muted/40 px-2 py-0.5 rounded-full text-muted-foreground">
            {item.product?.name ?? `#${item.productId}`} ×{item.quantity}
          </span>
        ))}
      </div>
      {/* Member note (read-only for admin) */}
      {order.memberNote && (
        <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 border border-border/40">
          <span className="font-medium text-foreground/60 mr-1">Member note:</span>{order.memberNote}
        </div>
      )}
      {/* Admin note */}
      {noteOpen && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Internal admin note (not visible to member)..."
            className="text-xs resize-none"
            rows={2}
            maxLength={2000}
          />
          <div className="flex gap-2">
            <Button
              size="sm" className="h-6 text-xs gap-1"
              onClick={() => { onSaveAdminNote(adminNote); setNoteOpen(false); }}
            >
              <Save size={10} /> Save
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs"
              onClick={() => { setAdminNote(order.adminNotes ?? ""); setNoteOpen(false); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminBuyDetail() {
  const { id } = useParams<{ id: string }>();
  const buyId = parseInt(id ?? "0");
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.groupBuys.getWithDetails.useQuery({ id: buyId });
  const { data: orders, refetch: refetchOrders } = trpc.orders.listByBuy.useQuery({ groupBuyId: buyId });
  const { data: testResults, refetch: refetchTests } = trpc.testResults.listByBuy.useQuery({ groupBuyId: buyId });

  const updateStatus = trpc.groupBuys.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("Product added."); refetch(); setProductDialog(false); setProductForm(EMPTY_PRODUCT); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success("Product removed."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Product updated."); refetch(); setEditProductDialog(false); setEditProductId(null); },
    onError: (e) => toast.error(e.message),
  });
  const createTier = trpc.tiers.create.useMutation({
    onSuccess: () => { toast.success("Tier added."); refetch(); setTierDialog(false); setTierForm(EMPTY_TIER); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTier = trpc.tiers.delete.useMutation({
    onSuccess: () => { toast.success("Tier removed."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Order updated."); refetchOrders(); },
    onError: (e) => toast.error(e.message),
  });
  const updateAdminNote = trpc.orderNotes.updateAdminNote.useMutation({
    onSuccess: () => { toast.success("Admin note saved."); refetchOrders(); },
    onError: (e) => toast.error(e.message),
  });
  const updateTracking = trpc.orders.updateTracking.useMutation({
    onSuccess: () => { toast.success("Tracking saved."); refetchOrders(); setTrackingDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const createTest = trpc.testResults.create.useMutation({
    onSuccess: () => { toast.success("Test record created."); refetchTests(); setTestDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateTestStatus = trpc.testResults.updateStatus.useMutation({
    onSuccess: () => { toast.success("Test status updated."); refetchTests(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadCoa = trpc.testResults.uploadCoa.useMutation({
    onSuccess: () => { toast.success("COA uploaded and published."); refetchTests(); },
    onError: (e) => toast.error(e.message),
  });

  // Product dialog
  const EMPTY_PRODUCT = { name: "", description: "", pricePerUnit: "", unit: "vial", minQuantity: "1", maxQuantity: "", vendorSkuId: "" };
  const [productDialog, setProductDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const setP = (f: keyof typeof EMPTY_PRODUCT) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProductForm((prev) => ({ ...prev, [f]: e.target.value }));

  // Catalog picker — load SKUs for the buy's vendor (if linked)
  const buyVendorId = (data?.buy as any)?.vendorId ?? null;
  const { data: vendorSkus } = trpc.vendors.listSkus.useQuery(
    { vendorId: buyVendorId! },
    { enabled: !!buyVendorId }
  );
  const handleCatalogSelect = (skuId: string) => {
    if (!skuId) { setProductForm(EMPTY_PRODUCT); return; }
    const sku = vendorSkus?.find((s) => String(s.id) === skuId);
    if (sku) {
      setProductForm({
        vendorSkuId: skuId,
        name: sku.name,
        description: sku.description ?? "",
        pricePerUnit: parseFloat(sku.currentPrice as string).toFixed(2),
        unit: sku.unit ?? "vial",
        minQuantity: "1",
        maxQuantity: "",
      });
    }
  };

  // Rate Vendor dialog
  const [showRateVendor, setShowRateVendor] = useState(false);
  const EMPTY_RATING = { qualityScore: 5, commScore: 5, speedScore: 5, packagingScore: 5, notes: "" };
  const [ratingForm, setRatingForm] = useState(EMPTY_RATING);
  const rateVendorMutation = trpc.vendors.rate.useMutation({
    onSuccess: () => { toast.success("Vendor rated — thank you!"); setShowRateVendor(false); setRatingForm(EMPTY_RATING); },
    onError: (e) => toast.error(e.message),
  });

  // Edit product dialog
  const [editProductDialog, setEditProductDialog] = useState(false);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [editProductForm, setEditProductForm] = useState(EMPTY_PRODUCT);
  const setEP = (f: keyof typeof EMPTY_PRODUCT) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditProductForm((prev) => ({ ...prev, [f]: e.target.value }));
  const openEditProduct = (p: typeof products[number]) => {
    setEditProductId(p.id);
    setEditProductForm({
      name: p.name,
      description: p.description ?? "",
      pricePerUnit: parseFloat(p.pricePerUnit as string).toFixed(2),
      unit: p.unit,
      minQuantity: String(p.minQuantity),
      maxQuantity: p.maxQuantity ? String(p.maxQuantity) : "",
      vendorSkuId: (p as any).vendorSkuId ? String((p as any).vendorSkuId) : "",
    });
    setEditProductDialog(true);
  };

  // Tier dialog
  const EMPTY_TIER = { name: "", minAmount: "", description: "", sortOrder: "0" };
  const [tierDialog, setTierDialog] = useState(false);
  const [tierForm, setTierForm] = useState(EMPTY_TIER);
  const setT = (f: keyof typeof EMPTY_TIER) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setTierForm((prev) => ({ ...prev, [f]: e.target.value }));

  // Tracking dialog
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [trackingNum, setTrackingNum] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");

  // Test dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testProductId, setTestProductId] = useState<string>("none");

  // COA upload
  const coaInputRef = useRef<HTMLInputElement>(null);
  const [coaTestId, setCoaTestId] = useState<number | null>(null);

  const handleCoaUpload = (testId: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadCoa.mutate({ id: testId, fileName: file.name, fileBase64: base64, mimeType: file.type || "application/pdf" });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading || !data) {
    return (
      <AppLayout showAdmin>
        <div className="container py-8 space-y-4">
          <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
          <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  const { buy, products, tiers, stats } = data;

  return (
    <AppLayout showAdmin>
      <div className="container py-8 space-y-6">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
          <Link href="/admin/group-buys"><ChevronLeft size={16} className="mr-1" /> Group Buys</Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{buy.title}</h1>
              <StatusBadge status={buy.status} type="buy" />
            </div>
            {buy.description && <p className="text-muted-foreground text-sm">{buy.description}</p>}
            {(buy as any).vendorName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Vendor:</span>
                {(buy as any).vendorId ? (
                  <Link href={`/admin/vendors/${(buy as any).vendorId}`} className="text-accent hover:underline font-medium">
                    {(buy as any).vendorName}
                  </Link>
                ) : (
                  <span className="font-medium">{(buy as any).vendorName}</span>
                )}
                {(buy as any).vendorCountry && (
                  <span className="text-muted-foreground/60">({(buy as any).vendorCountry})</span>
                )}
              </div>
            )}
          </div>
          {/* Status Transition + Rate Vendor */}
          <div className="flex items-center gap-2 shrink-0">
            {buy.status === "Complete" && (buy as any).vendorId && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs border-accent/40 text-accent hover:bg-accent/10"
                onClick={() => setShowRateVendor(true)}
              >
                <Star size={12} /> Rate Vendor
              </Button>
            )}
            <Select
              value={buy.status}
              onValueChange={(v) => updateStatus.mutate({ id: buyId, status: v as BuyStatus })}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Participants", value: stats.participantCount },
            { label: "Committed", value: `$${stats.totalCommitted.toFixed(0)}` },
            { label: "Paid", value: `$${stats.totalPaid.toFixed(0)}` },
            { label: "Shipped", value: stats.shippedCount },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold tabular-nums mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-4">
          <MoqProgress current={stats.totalCommitted} target={parseFloat(buy.moqTarget as string)} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="products" className="gap-1.5"><Package size={13} /> Products</TabsTrigger>
            <TabsTrigger value="tiers" className="gap-1.5"><Users size={13} /> Tiers</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <FlaskConical size={13} /> Orders ({orders?.length ?? 0})
              {(() => {
                const pendingCount = orders?.filter((o: any) => o.status === "Payment Pending").length ?? 0;
                return pendingCount > 0 ? (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                    {pendingCount}
                  </span>
                ) : null;
              })()}
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-1.5"><ShieldCheck size={13} /> Testing</TabsTrigger>
          </TabsList>

          {/* ── Products Tab ─────────────────────────────────────────────── */}
          <TabsContent value="products" className="space-y-3 mt-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportDialog(true)}>
                <Upload size={13} /> Import CSV / XLSX
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setProductDialog(true)}>
                <Plus size={13} /> Add Product
              </Button>
            </div>
            {products.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No products yet.</div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.name}</p>
                          {!p.inStock && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${parseFloat(p.pricePerUnit as string).toFixed(2)} / {p.unit}
                          {p.minQuantity > 1 && ` · Min: ${p.minQuantity}`}
                          {p.maxQuantity && ` · Max: ${p.maxQuantity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Stock toggle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={p.inStock}
                                onCheckedChange={(checked) =>
                                  updateProduct.mutate({ id: p.id, inStock: checked })
                                }
                                className="scale-75"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {p.inStock ? "In stock — click to mark out of stock" : "Out of stock — click to restore"}
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost" size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEditProduct(p)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirm(`Remove "${p.name}"?`) && deleteProduct.mutate({ id: p.id })}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tiers Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="tiers" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setTierDialog(true)}>
                <Plus size={13} /> Add Tier
              </Button>
            </div>
            {tiers.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                No tiers configured. Members can still order without a tier.
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Min ${parseFloat(tier.minAmount as string).toFixed(0)}
                          {tier.description && ` · ${tier.description}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirm(`Remove tier "${tier.name}"?`) && deleteTier.mutate({ id: tier.id })}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Orders Tab ────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="space-y-3 mt-4">
            {/* Orders toolbar: Import Tracking + CSV Export */}
            {orders && orders.length > 0 && (
              <div className="flex justify-end gap-2">
                <BulkTrackingImportDialog groupBuyId={buyId} onSuccess={refetchOrders} />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const rows: string[][] = [
                      ["Member Name", "Email", "Status", "Total Amount", "Items", "Tracking Number", "Carrier",
                       "Ship To Name", "Address 1", "Address 2", "City", "State", "Zip", "Country", "Order Date"],
                    ];
                    (orders as any[]).forEach((o) => {
                      const items = (o.items ?? []).map((i: any) => `${i.product?.name ?? `#${i.productId}`} x${i.quantity}`).join(" | ");
                      rows.push([
                        o.user?.name ?? "",
                        o.user?.email ?? "",
                        o.status,
                        parseFloat(o.totalAmount).toFixed(2),
                        items,
                        o.trackingNumber ?? "",
                        o.trackingCarrier ?? "",
                        o.shippingName ?? "",
                        o.shippingAddress1 ?? "",
                        o.shippingAddress2 ?? "",
                        o.shippingCity ?? "",
                        o.shippingState ?? "",
                        o.shippingZip ?? "",
                        o.shippingCountry ?? "",
                        new Date(o.createdAt).toLocaleDateString(),
                      ]);
                    });
                    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `orders-buy-${buyId}-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileDown size={13} /> Export CSV
                </Button>
              </div>
            )}
            {!orders || orders.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No orders yet.</div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {orders.map((order: any) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onStatusChange={(v) => updateOrderStatus.mutate({ id: order.id, status: v as OrderStatus })}
                      onTrackClick={() => {
                        setTrackingOrderId(order.id);
                        setTrackingNum(order.trackingNumber ?? "");
                        setTrackingCarrier(order.trackingCarrier ?? "");
                        setTrackingDialog(true);
                      }}
                      onSaveAdminNote={(note) => updateAdminNote.mutate({ orderId: order.id, note })}
                      onMarkPaid={() => updateOrderStatus.mutate({ id: order.id, status: "Paid" })}
                      isMarkingPaid={updateOrderStatus.isPending && updateOrderStatus.variables?.id === order.id && updateOrderStatus.variables?.status === "Paid"}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Testing Tab ───────────────────────────────────────────────── */}
          <TabsContent value="testing" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Lab: Freedom Diagnostics — HPLC/LC-MS</p>
              <Button size="sm" className="gap-1.5" onClick={() => setTestDialog(true)}>
                <Plus size={13} /> Add Test Record
              </Button>
            </div>
            {!testResults || testResults.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                No test records yet. Create one when samples are ready to ship.
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result) => {
                  const prod = products.find((p) => p.id === result.productId);
                  return (
                    <div key={result.id} className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">
                            {prod?.name ?? "Batch"} — {result.labName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            HPLC/LC-MS COA
                            {result.coaAccessionNumber && ` · #${result.coaAccessionNumber}`}
                            {result.purityResult && ` · Purity: ${result.purityResult}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={result.status} type="test" />
                          <Select
                            value={result.status}
                            onValueChange={(v) => updateTestStatus.mutate({ id: result.id, status: v as TestStatus })}
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEST_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* COA Upload / Download */}
                      <div className="flex items-center gap-2">
                        {result.coaFileUrl ? (
                          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                            <a href={result.coaFileUrl} target="_blank" rel="noopener noreferrer">
                              <Download size={12} /> Download COA PDF
                            </a>
                          </Button>
                        ) : (
                          <Button
                            size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => { setCoaTestId(result.id); coaInputRef.current?.click(); }}
                            disabled={uploadCoa.isPending}
                          >
                            <Upload size={12} /> Upload COA PDF
                          </Button>
                        )}
                        {result.publishedAt && (
                          <span className="text-xs text-primary">Published {new Date(result.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden COA file input */}
      <input
        ref={coaInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && coaTestId !== null) handleCoaUpload(coaTestId, file);
          e.target.value = "";
        }}
      />

      {/* Product Dialog */}
      <Dialog open={productDialog} onOpenChange={(v) => { setProductDialog(v); if (!v) setProductForm(EMPTY_PRODUCT); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {/* Catalog picker — only shown when buy has a linked vendor with SKUs */}
            {vendorSkus && vendorSkus.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quick-fill from vendor catalog</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={productForm.vendorSkuId}
                  onChange={(e) => handleCatalogSelect(e.target.value)}
                >
                  <option value="">— Select a SKU to auto-fill —</option>
                  {vendorSkus.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} — ${parseFloat(s.currentPrice as string).toFixed(2)}/{s.unit}
                    </option>
                  ))}
                </select>
                {productForm.vendorSkuId && (
                  <p className="text-xs text-emerald-500">Fields pre-filled from catalog. You can still edit them below.</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={productForm.name} onChange={setP("name")} placeholder="BPC-157 5mg" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={productForm.description} onChange={setP("description")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price per Unit ($) *</Label>
                <Input type="number" step="0.01" value={productForm.pricePerUnit} onChange={setP("pricePerUnit")} placeholder="12.50" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={productForm.unit} onChange={setP("unit")} placeholder="vial" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Qty</Label>
                <Input type="number" value={productForm.minQuantity} onChange={setP("minQuantity")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Qty</Label>
                <Input type="number" value={productForm.maxQuantity} onChange={setP("maxQuantity")} placeholder="None" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProductDialog(false); setProductForm(EMPTY_PRODUCT); }}>Cancel</Button>
            <Button onClick={() => createProduct.mutate({
              groupBuyId: buyId,
              vendorSkuId: productForm.vendorSkuId ? parseInt(productForm.vendorSkuId) : undefined,
              name: productForm.name,
              description: productForm.description || undefined,
              pricePerUnit: productForm.pricePerUnit,
              unit: productForm.unit,
              minQuantity: parseInt(productForm.minQuantity) || 1,
              maxQuantity: productForm.maxQuantity ? parseInt(productForm.maxQuantity) : undefined,
            })} disabled={createProduct.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editProductDialog} onOpenChange={(v) => { setEditProductDialog(v); if (!v) setEditProductId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editProductForm.name} onChange={setEP("name")} placeholder="BPC-157 5mg" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editProductForm.description} onChange={setEP("description")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price per Unit ($) *</Label>
                <Input type="number" step="0.01" value={editProductForm.pricePerUnit} onChange={setEP("pricePerUnit")} placeholder="12.50" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={editProductForm.unit} onChange={setEP("unit")} placeholder="vial" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Qty</Label>
                <Input type="number" value={editProductForm.minQuantity} onChange={setEP("minQuantity")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Qty</Label>
                <Input type="number" value={editProductForm.maxQuantity} onChange={setEP("maxQuantity")} placeholder="None" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProductDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editProductId) return;
                updateProduct.mutate({
                  id: editProductId,
                  name: editProductForm.name,
                  description: editProductForm.description || undefined,
                  pricePerUnit: editProductForm.pricePerUnit,
                  unit: editProductForm.unit,
                  minQuantity: parseInt(editProductForm.minQuantity) || 1,
                  maxQuantity: editProductForm.maxQuantity ? parseInt(editProductForm.maxQuantity) : null,
                });
              }}
              disabled={updateProduct.isPending || !editProductForm.name || !editProductForm.pricePerUnit}
            >
              {updateProduct.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Products Dialog */}
      <ImportProductsDialog
        open={importDialog}
        onOpenChange={setImportDialog}
        groupBuyId={buyId}
        onImported={() => refetch()}
      />

      {/* Tier Dialog */}
      <Dialog open={tierDialog} onOpenChange={setTierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Participation Tier</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Tier Name *</Label>
              <Input value={tierForm.name} onChange={setT("name")} placeholder="Standard, Premium, Bulk..." />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Spend ($) *</Label>
              <Input type="number" value={tierForm.minAmount} onChange={setT("minAmount")} placeholder="250" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={tierForm.description} onChange={setT("description")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialog(false)}>Cancel</Button>
            <Button onClick={() => createTier.mutate({ groupBuyId: buyId, name: tierForm.name, minAmount: tierForm.minAmount, description: tierForm.description || undefined, sortOrder: parseInt(tierForm.sortOrder) || 0 })} disabled={createTier.isPending}>
              Add Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={trackingDialog} onOpenChange={setTrackingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Tracking</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Input value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)} placeholder="USPS, UPS, FedEx..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tracking Number *</Label>
              <Input value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)} placeholder="1Z999AA10123456784" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!trackingOrderId || !trackingNum) return;
                updateTracking.mutate({ id: trackingOrderId, trackingNumber: trackingNum, trackingCarrier: trackingCarrier || undefined });
              }}
              disabled={updateTracking.isPending}
            >
              Save & Mark Shipped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Record Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Test Record</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Product (optional)</Label>
              <Select value={testProductId} onValueChange={setTestProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Whole batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole Batch</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Lab: Freedom Diagnostics (HPLC/LC-MS)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createTest.mutate({ groupBuyId: buyId, productId: testProductId !== "none" ? parseInt(testProductId) : undefined, labName: "Freedom Diagnostics" })}
              disabled={createTest.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Vendor Dialog */}
      <Dialog open={showRateVendor} onOpenChange={setShowRateVendor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star size={16} className="text-accent" /> Rate Vendor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Rating <span className="font-medium text-foreground">{(buy as any).vendorName}</span> for this buy. Scores are 1–5.</p>
            {([
              { key: "qualityScore", label: "Product Quality" },
              { key: "commScore", label: "Communication" },
              { key: "speedScore", label: "Speed / Lead Time" },
              { key: "packagingScore", label: "Packaging" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium w-36">{label}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatingForm((prev) => ({ ...prev, [key]: n }))}
                      className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                        ratingForm[key] >= n
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
              <Textarea
                className="mt-1 text-sm"
                rows={3}
                placeholder="Any notes about this vendor for this buy..."
                value={ratingForm.notes}
                onChange={(e) => setRatingForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateVendor(false)}>Cancel</Button>
            <Button
              disabled={rateVendorMutation.isPending}
              onClick={() => rateVendorMutation.mutate({
                vendorId: (buy as any).vendorId,
                groupBuyId: buyId,
                qualityScore: ratingForm.qualityScore,
                commScore: ratingForm.commScore,
                speedScore: ratingForm.speedScore,
                packagingScore: ratingForm.packagingScore,
                notes: ratingForm.notes || undefined,
              })}
            >
              {rateVendorMutation.isPending ? "Saving..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
