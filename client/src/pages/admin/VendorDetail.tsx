import React, { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportPriceListDialog } from "@/components/ImportPriceListDialog";
import {
  ArrowLeft,
  Plus,
  Star,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Globe,
  Mail,
  User,
  Edit2,
  ToggleLeft,
  FlaskConical,
  FileText,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  CN: { name: "China", flag: "🇨🇳" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  IN: { name: "India", flag: "🇮🇳" },
  DE: { name: "Germany", flag: "🇩🇪" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AU: { name: "Australia", flag: "🇦🇺" },
  KR: { name: "South Korea", flag: "🇰🇷" },
};
const COUNTRIES = Object.keys(COUNTRY_MAP);

function countryDisplay(code: string) {
  const c = COUNTRY_MAP[code];
  return c ? `${c.flag} ${c.name}` : code;
}

function getLeadTime(country: string) {
  return country === "US" ? "2–4 weeks (domestic)" : "4–8 weeks (international)";
}

interface AddSkuForm {
  skuCode: string;
  name: string;
  productLine: string;
  description: string;
  unit: string;
  currentPrice: string;
  minQuantity: string;
}

const EMPTY_SKU: AddSkuForm = {
  skuCode: "", name: "", productLine: "", description: "", unit: "vial", currentPrice: "", minQuantity: "1",
};

// ── SkuPurityRow: shows all COAs for a SKU as a purity timeline ────────────
function SkuPurityRow({ sku }: { sku: any }) {
  const { data: coas, isLoading } = trpc.vendors.listSkuCoas.useQuery({ vendorSkuId: sku.id });
  if (isLoading) return <Skeleton className="h-12 w-full rounded-lg" />;
  if (!coas || coas.length === 0) return null;
  const avgPurity = coas.filter((c: any) => c.purityPct).reduce((sum: number, c: any, _: number, arr: any[]) =>
    sum + parseFloat(c.purityPct) / arr.filter((x: any) => x.purityPct).length, 0);
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium text-sm">{sku.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{sku.skuCode}</p>
        </div>
        {avgPurity > 0 && (
          <Badge className={avgPurity >= 98 ? "bg-green-500/20 text-green-400 border-green-500/30" : avgPurity >= 95 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            avg {avgPurity.toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        {coas.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground w-24 shrink-0">{c.testedAt ? new Date(c.testedAt).toLocaleDateString() : "No date"}</span>
            {c.purityPct ? (
              <Badge variant="outline" className="text-xs px-1.5 py-0">{parseFloat(c.purityPct).toFixed(1)}% purity</Badge>
            ) : (
              <span className="text-muted-foreground italic">No purity recorded</span>
            )}
            {c.labName && <span className="text-muted-foreground">{c.labName}</span>}
            <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-accent hover:underline flex items-center gap-1">
              <ExternalLink size={10} /> View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminVendorDetail() {
  const params = useParams<{ id: string }>();
  const vendorId = parseInt(params.id ?? "0");

  const [showImport, setShowImport] = useState(false);
  const [showAddSku, setShowAddSku] = useState(false);
  const [skuForm, setSkuForm] = useState<AddSkuForm>(EMPTY_SKU);
  const [editVendor, setEditVendor] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [showEditPrice, setShowEditPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [coaSkuId, setCoaSkuId] = useState<number | null>(null);
  const [showCoaDialog, setShowCoaDialog] = useState(false);
  const [expandedCoaSkuId, setExpandedCoaSkuId] = useState<number | null>(null);
  const coaFileRef = useRef<HTMLInputElement>(null);
  const [coaForm, setCoaForm] = useState({ labName: "", purityPct: "", testedAt: "", notes: "", file: null as File | null });

  const utils = trpc.useUtils();

  const { data: vendor, isLoading: vendorLoading } = trpc.vendors.get.useQuery({ id: vendorId });
  const { data: skus, isLoading: skusLoading, refetch: refetchSkus } = trpc.vendors.listSkus.useQuery({
    vendorId,
    includeInactive,
  });
  const { data: priceHistory } = trpc.vendors.priceHistory.useQuery(
    { vendorSkuId: selectedSkuId! },
    { enabled: !!selectedSkuId && showPriceHistory }
  );

  const { data: ratingSummary } = trpc.vendors.ratingSummary.useQuery({ vendorId });
  const { data: ratingsList } = trpc.vendors.ratings.useQuery({ vendorId });

  const createSkuMutation = trpc.vendors.createSku.useMutation({
    onSuccess: () => {
      toast.success("SKU added.");
      utils.vendors.listSkus.invalidate({ vendorId });
      setShowAddSku(false);
      setSkuForm(EMPTY_SKU);
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const updateSkuMutation = trpc.vendors.updateSku.useMutation({
    onSuccess: () => {
      toast.success("Price updated.");
      utils.vendors.listSkus.invalidate({ vendorId });
      setShowEditPrice(false);
      setNewPrice("");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const deactivateSkuMutation = trpc.vendors.deactivateSku.useMutation({
    onSuccess: () => {
      toast.success("SKU deactivated.");
      utils.vendors.listSkus.invalidate({ vendorId });
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const uploadCoaMutation = trpc.vendors.uploadSkuCoa.useMutation({
    onSuccess: () => {
      toast.success("COA uploaded successfully.");
      if (coaSkuId) utils.vendors.listSkuCoas.invalidate({ vendorSkuId: coaSkuId });
      setShowCoaDialog(false);
      setCoaForm({ labName: "", purityPct: "", testedAt: "", notes: "", file: null });
    },
    onError: (e) => toast.error(`Upload failed: ${e.message}`),
  });

  const deleteCoaMutation = trpc.vendors.deleteSkuCoa.useMutation({
    onSuccess: () => {
      toast.success("COA removed.");
      if (expandedCoaSkuId) utils.vendors.listSkuCoas.invalidate({ vendorSkuId: expandedCoaSkuId });
    },
    onError: (e) => toast.error(`Delete failed: ${e.message}`),
  });

  const { data: coaList, isLoading: coaListLoading } = trpc.vendors.listSkuCoas.useQuery(
    { vendorSkuId: expandedCoaSkuId! },
    { enabled: !!expandedCoaSkuId }
  );

  const handleCoaUpload = () => {
    if (!coaSkuId || !coaForm.file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadCoaMutation.mutate({
        vendorSkuId: coaSkuId,
        filename: coaForm.file!.name,
        fileBase64: base64,
        mimeType: coaForm.file!.type || "application/pdf",
        labName: coaForm.labName || undefined,
        purityPct: coaForm.purityPct || undefined,
        testedAt: coaForm.testedAt || undefined,
        notes: coaForm.notes || undefined,
      });
    };
    reader.readAsDataURL(coaForm.file);
  };

  const updateVendorMutation = trpc.vendors.update.useMutation({
    onSuccess: () => {
      toast.success("Vendor updated.");
      utils.vendors.get.invalidate({ id: vendorId });
      utils.vendors.list.invalidate();
      setEditVendor(false);
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  if (vendorLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Vendor not found.</p>
        <Link href="/admin/vendors">
          <Button variant="outline" className="mt-4 gap-2"><ArrowLeft size={14} /> Back to Vendors</Button>
        </Link>
      </div>
    );
  }

  // Group SKUs by product line
  const grouped: Record<string, typeof skus> = {};
  for (const sku of skus ?? []) {
    const line = sku.productLine ?? "Other";
    if (!grouped[line]) grouped[line] = [];
    grouped[line]!.push(sku);
  }

  const activeSkus = (skus ?? []).filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/vendors">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mt-0.5">
            <ArrowLeft size={14} /> Vendors
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{vendor.name}</h1>
            {!vendor.isActive && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{countryDisplay(vendor.country)}</span>
            <span className="text-xs">{getLeadTime(vendor.country)}</span>
            {vendor.website && (
              <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary">
                <Globe size={12} /> {vendor.website}
              </a>
            )}
            {vendor.contactName && <span className="flex items-center gap-1"><User size={12} /> {vendor.contactName}</span>}
            {vendor.contactEmail && <span className="flex items-center gap-1"><Mail size={12} /> {vendor.contactEmail}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditForm({ ...vendor }); setEditVendor(true); }}>
            <Edit2 size={13} /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowImport(true)}>
            <Upload size={13} /> Import Price List
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setShowAddSku(true)}>
            <Plus size={13} /> Add SKU
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active SKUs</p>
          <p className="text-2xl font-bold mt-1">{activeSkus.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Product Lines</p>
          <p className="text-2xl font-bold mt-1">{Object.keys(grouped).length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Price</p>
          <p className="text-2xl font-bold mt-1">
            {activeSkus.length > 0
              ? `$${(activeSkus.reduce((s, k) => s + parseFloat(k.currentPrice as string), 0) / activeSkus.length).toFixed(2)}`
              : "—"}
          </p>
        </div>
      </div>

      {/* SKU Catalog */}
      <Tabs defaultValue="catalog">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="catalog">SKU Catalog</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="purity">Purity History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>

        <TabsContent value="catalog" className="mt-4">
          {skusLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : (skus ?? []).length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No SKUs yet</p>
              <p className="text-sm mt-1">Add SKUs manually or import a price list file.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                  <Upload size={14} /> Import Price List
                </Button>
                <Button className="gap-2" onClick={() => setShowAddSku(true)}>
                  <Plus size={14} /> Add SKU
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([line, lineSkus]) => (
                <div key={line}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {line}
                  </p>
                  <div className="glass-card overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Min Qty</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(lineSkus ?? []).map((sku) => {
                          return (
                          <React.Fragment key={sku.id}>
                          <TableRow className={!sku.isActive ? "opacity-50" : ""}>
                            <TableCell className="font-mono text-xs">{sku.skuCode}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{sku.name}</div>
                              {sku.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{sku.description}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{sku.unit}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              ${parseFloat(sku.currentPrice as string).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm">{sku.minQuantity}</TableCell>
                            <TableCell>
                              {sku.isActive
                                ? <Badge variant="secondary" className="text-xs">Active</Badge>
                                : <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs gap-1"
                                  onClick={() => setExpandedCoaSkuId(expandedCoaSkuId === sku.id ? null : sku.id)}
                                >
                                  {expandedCoaSkuId === sku.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  COAs
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    setSelectedSkuId(sku.id);
                                    setShowPriceHistory(true);
                                  }}
                                >
                                  History
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    setSelectedSkuId(sku.id);
                                    setNewPrice(parseFloat(sku.currentPrice as string).toFixed(2));
                                    setShowEditPrice(true);
                                  }}
                                >
                                  Edit Price
                                </Button>
                                {sku.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm(`Deactivate ${sku.name}?`)) deactivateSkuMutation.mutate({ id: sku.id });
                                    }}
                                  >
                                    Deactivate
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Expandable COA panel */}
                          {expandedCoaSkuId === sku.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/20 px-6 py-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <FlaskConical size={14} className="text-accent" />
                                      Certificates of Analysis - {sku.name}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-xs"
                                      onClick={() => { setCoaSkuId(sku.id); setShowCoaDialog(true); }}
                                    >
                                      <Upload size={12} /> Upload COA
                                    </Button>
                                  </div>
                                  {coaListLoading ? (
                                    <p className="text-xs text-muted-foreground">Loading...</p>
                                  ) : !coaList || coaList.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No COAs uploaded yet. Upload a PDF or image to start tracking purity.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {coaList.map((coa) => (
                                        <div key={coa.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                                          <div className="flex items-center gap-3">
                                            <FileText size={14} className="text-muted-foreground shrink-0" />
                                            <div>
                                              <p className="text-xs font-medium">{coa.filename}</p>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                {coa.labName && <span className="text-xs text-muted-foreground">{coa.labName}</span>}
                                                {coa.purityPct && (
                                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                                    {parseFloat(coa.purityPct as string).toFixed(1)}% purity
                                                  </Badge>
                                                )}
                                                {coa.testedAt && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {new Date(coa.testedAt).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <a href={coa.fileUrl} target="_blank" rel="noopener noreferrer">
                                              <Button variant="ghost" size="sm" className="text-xs gap-1">
                                                <ExternalLink size={11} /> View
                                              </Button>
                                            </a>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-xs text-destructive hover:text-destructive"
                                              onClick={() => { if (confirm("Remove this COA?")) deleteCoaMutation.mutate({ id: coa.id }); }}
                                            >
                                              <Trash2 size={11} />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="mt-4">
          <div className="space-y-4">
            {/* Rating Summary Cards */}
            {ratingSummary && ratingSummary.count > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { label: "Product Quality", val: ratingSummary.quality },
                    { label: "Communication", val: ratingSummary.communication },
                    { label: "Speed", val: ratingSummary.speed },
                    { label: "Packaging", val: ratingSummary.packaging },
                  ] as const).map(({ label, val }) => (
                    <div key={label} className="glass-card p-4 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold tabular-nums mt-1">
                        {val ? parseFloat(String(val)).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">/ 5</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Based on {ratingSummary.count} rating{ratingSummary.count !== 1 ? "s" : ""}
                </p>
                {/* Individual Ratings */}
                <div className="space-y-2">
                  {ratingsList?.map((r: any) => (
                    <div key={r.id} className="glass-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">{r.user?.name ?? r.user?.email ?? `User #${r.userId}`}</span>
                            {r.groupBuyId && <span>· Buy #{r.groupBuyId}</span>}
                            <span>· {new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-4 text-xs">
                            <span>Quality: <strong>{r.qualityScore}/5</strong></span>
                            <span>Comm: <strong>{r.commScore}/5</strong></span>
                            <span>Speed: <strong>{r.speedScore}/5</strong></span>
                            <span>Packaging: <strong>{r.packagingScore}/5</strong></span>
                          </div>
                          {r.notes && <p className="text-xs text-muted-foreground mt-1 italic">{r.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <Star size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-sm">No ratings yet for this vendor.</p>
                <p className="text-xs text-muted-foreground mt-1">Rate a vendor from a completed buy's detail page.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Purity History Tab */}
        <TabsContent value="purity" className="mt-4">
          <div className="space-y-3">
            {(skus ?? []).filter((s) => s.isActive).length === 0 ? (
              <div className="glass-card p-8 text-center">
                <FlaskConical size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-sm">No active SKUs with COA data yet.</p>
              </div>
            ) : (
              (skus ?? []).filter((s) => s.isActive).map((sku) => (
                <SkuPurityRow key={sku.id} sku={sku} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="glass-card p-6">
            {vendor.notes ? (
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">No notes for this vendor.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Import Price List Dialog */}
      <ImportPriceListDialog
        open={showImport}
        onOpenChange={setShowImport}
        vendorId={vendorId}
        vendorName={vendor.name}
        onImported={() => utils.vendors.listSkus.invalidate({ vendorId })}
      />

      {/* Add SKU Dialog */}
      <Dialog open={showAddSku} onOpenChange={setShowAddSku}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add SKU</DialogTitle>
            <DialogDescription>Add a single SKU to {vendor.name}'s catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU Code *</label>
                <Input className="mt-1" placeholder="BPC157-5MG" value={skuForm.skuCode}
                  onChange={(e) => setSkuForm({ ...skuForm, skuCode: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product Line</label>
                <Input className="mt-1" placeholder="Peptides" value={skuForm.productLine}
                  onChange={(e) => setSkuForm({ ...skuForm, productLine: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
              <Input className="mt-1" placeholder="BPC-157 5mg" value={skuForm.name}
                onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price (USD) *</label>
                <Input className="mt-1" placeholder="18.00" value={skuForm.currentPrice}
                  onChange={(e) => setSkuForm({ ...skuForm, currentPrice: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</label>
                <Input className="mt-1" placeholder="vial" value={skuForm.unit}
                  onChange={(e) => setSkuForm({ ...skuForm, unit: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Min Qty</label>
                <Input className="mt-1" type="number" min="1" value={skuForm.minQuantity}
                  onChange={(e) => setSkuForm({ ...skuForm, minQuantity: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <Input className="mt-1" placeholder="Optional details" value={skuForm.description}
                onChange={(e) => setSkuForm({ ...skuForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSku(false)}>Cancel</Button>
            <Button
              disabled={!skuForm.skuCode || !skuForm.name || !skuForm.currentPrice || createSkuMutation.isPending}
              onClick={() => createSkuMutation.mutate({
                vendorId,
                skuCode: skuForm.skuCode,
                name: skuForm.name,
                productLine: skuForm.productLine || undefined,
                description: skuForm.description || undefined,
                unit: skuForm.unit || "vial",
                currentPrice: parseFloat(skuForm.currentPrice).toFixed(2),
                minQuantity: parseInt(skuForm.minQuantity) || 1,
              })}
            >
              {createSkuMutation.isPending ? "Adding..." : "Add SKU"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={showPriceHistory} onOpenChange={setShowPriceHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>
              {skus?.find((s) => s.id === selectedSkuId)?.name ?? "SKU"} — all recorded price changes
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-80">
            {!priceHistory || priceHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No price history yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((h, i) => {
                    const prev = priceHistory[i + 1];
                    const prevPrice = prev ? parseFloat(prev.price as string) : null;
                    const curPrice = parseFloat(h.price as string);
                    const diff = prevPrice !== null ? curPrice - prevPrice : null;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">
                          {new Date(h.effectiveAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <div className="flex items-center justify-end gap-2">
                            ${curPrice.toFixed(2)}
                            {diff !== null && diff !== 0 && (
                              <span className={`text-xs flex items-center gap-0.5 ${diff > 0 ? "text-destructive" : "text-accent"}`}>
                                {diff > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                              </span>
                            )}
                            {diff === 0 && <Minus size={11} className="text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{h.source}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={showEditPrice} onOpenChange={setShowEditPrice}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Update Price</DialogTitle>
            <DialogDescription>
              {skus?.find((s) => s.id === selectedSkuId)?.name} — enter the new price.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Price (USD)</label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPrice(false)}>Cancel</Button>
            <Button
              disabled={!newPrice || parseFloat(newPrice) <= 0 || updateSkuMutation.isPending}
              onClick={() => {
                if (selectedSkuId) {
                  updateSkuMutation.mutate({
                    id: selectedSkuId,
                    currentPrice: parseFloat(newPrice).toFixed(2),
                  });
                }
              }}
            >
              {updateSkuMutation.isPending ? "Saving..." : "Update Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COA Upload Dialog */}
      <Dialog open={showCoaDialog} onOpenChange={(open) => { setShowCoaDialog(open); if (!open) setCoaForm({ labName: "", purityPct: "", testedAt: "", notes: "", file: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical size={16} className="text-accent" /> Upload Certificate of Analysis
            </DialogTitle>
            <DialogDescription>
              {skus?.find((s) => s.id === coaSkuId)?.name} - attach a COA PDF or image for purity tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File *</label>
              <div className="mt-1">
                <input
                  ref={coaFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCoaForm((prev) => ({ ...prev, file: f }));
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => coaFileRef.current?.click()}
                >
                  <Upload size={14} />
                  {coaForm.file ? coaForm.file.name : "Choose PDF or image..."}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lab Name</label>
                <Input className="mt-1" placeholder="e.g. Janoshik" value={coaForm.labName}
                  onChange={(e) => setCoaForm((prev) => ({ ...prev, labName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purity %</label>
                <Input className="mt-1" type="number" step="0.1" min="0" max="100" placeholder="99.5" value={coaForm.purityPct}
                  onChange={(e) => setCoaForm((prev) => ({ ...prev, purityPct: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Date</label>
              <Input className="mt-1" type="date" value={coaForm.testedAt}
                onChange={(e) => setCoaForm((prev) => ({ ...prev, testedAt: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <Input className="mt-1" placeholder="Optional notes" value={coaForm.notes}
                onChange={(e) => setCoaForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoaDialog(false)}>Cancel</Button>
            <Button
              disabled={!coaForm.file || uploadCoaMutation.isPending}
              onClick={handleCoaUpload}
            >
              {uploadCoaMutation.isPending ? "Uploading..." : "Upload COA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={editVendor} onOpenChange={setEditVendor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
                <Input className="mt-1" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country *</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_MAP[c] ? `${COUNTRY_MAP[c].flag} ${COUNTRY_MAP[c].name}` : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
                <Input className="mt-1" value={editForm.website ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Name</label>
                  <Input className="mt-1" value={editForm.contactName ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Email</label>
                  <Input className="mt-1" value={editForm.contactEmail ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={editForm.notes ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(false)}>Cancel</Button>
            <Button
              disabled={!editForm?.name || updateVendorMutation.isPending}
              onClick={() => updateVendorMutation.mutate({
                id: vendorId,
                name: editForm.name,
                country: editForm.country,
                website: editForm.website || null,
                contactName: editForm.contactName || null,
                contactEmail: editForm.contactEmail || null,
                notes: editForm.notes || null,
              })}
            >
              {updateVendorMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
