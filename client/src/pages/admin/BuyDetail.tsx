import { AppLayout } from "@/components/AppLayout";
import { ImportProductsDialog } from "@/components/ImportProductsDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, Download, FlaskConical, Package, Plus, ShieldCheck, Trash2, Upload, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import type { BuyStatus, OrderStatus, TestStatus } from "../../../../shared/types";

const BUY_STATUSES: BuyStatus[] = ["Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete"];
const ORDER_STATUSES: OrderStatus[] = ["Committed", "Payment Pending", "Paid", "Shipped"];
const TEST_STATUSES: TestStatus[] = ["Pending", "Samples Sent", "In Testing", "Results Ready", "Published", "Failed"];

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
  const EMPTY_PRODUCT = { name: "", description: "", pricePerUnit: "", unit: "vial", minQuantity: "1", maxQuantity: "" };
  const [productDialog, setProductDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const setP = (f: keyof typeof EMPTY_PRODUCT) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProductForm((prev) => ({ ...prev, [f]: e.target.value }));

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
          </div>
          {/* Status Transition */}
          <div className="flex items-center gap-2 shrink-0">
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
            <TabsTrigger value="orders" className="gap-1.5"><FlaskConical size={13} /> Orders ({orders?.length ?? 0})</TabsTrigger>
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
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${parseFloat(p.pricePerUnit as string).toFixed(2)} / {p.unit}
                          {p.minQuantity > 1 && ` · Min: ${p.minQuantity}`}
                          {p.maxQuantity && ` · Max: ${p.maxQuantity}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirm(`Remove "${p.name}"?`) && deleteProduct.mutate({ id: p.id })}
                      >
                        <Trash2 size={13} />
                      </Button>
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
            {!orders || orders.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No orders yet.</div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {orders.map((order: any) => (
                    <div key={order.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{order.user?.name ?? order.user?.email ?? `User #${order.userId}`}</p>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(order.totalAmount as string).toFixed(2)} &middot; {order.items?.length ?? 0} item(s)
                            {order.trackingNumber && ` · Track: ${order.trackingNumber}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={order.status}
                            onValueChange={(v) => updateOrderStatus.mutate({ id: order.id, status: v as OrderStatus })}
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => {
                              setTrackingOrderId(order.id);
                              setTrackingNum(order.trackingNumber ?? "");
                              setTrackingCarrier(order.trackingCarrier ?? "");
                              setTrackingDialog(true);
                            }}
                          >
                            <Package size={11} /> Track
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
                    </div>
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
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
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
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button onClick={() => createProduct.mutate({ groupBuyId: buyId, name: productForm.name, description: productForm.description || undefined, pricePerUnit: productForm.pricePerUnit, unit: productForm.unit, minQuantity: parseInt(productForm.minQuantity) || 1, maxQuantity: productForm.maxQuantity ? parseInt(productForm.maxQuantity) : undefined })} disabled={createProduct.isPending}>
              Add
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
    </AppLayout>
  );
}
