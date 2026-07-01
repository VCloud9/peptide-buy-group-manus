import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Building2, Globe, ChevronRight, Search, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ISO country code → flag emoji + name
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

const LEAD_TIME: Record<string, string> = {
  US: "2–4 weeks (domestic)",
};

function getLeadTime(country: string) {
  return LEAD_TIME[country] ?? "4–8 weeks (international)";
}

function countryDisplay(code: string) {
  const c = COUNTRY_MAP[code];
  return c ? `${c.flag} ${c.name}` : code;
}

const COUNTRIES = ["US", "CN", "VN", "MY", "IN", "DE", "GB", "CA", "AU", "KR"];

interface CreateVendorForm {
  name: string; country: string; website: string; contactName: string; contactEmail: string; notes: string;
}
const EMPTY_FORM: CreateVendorForm = { name: "", country: "CN", website: "", contactName: "", contactEmail: "", notes: "" };

// ─── Global SKU Import helpers ────────────────────────────────────────────────
const IMPORT_ALIASES: Record<string, string> = {
  "vendor": "vendorName", "vendor name": "vendorName", "supplier": "vendorName",
  "sku": "skuCode", "sku code": "skuCode", "item code": "skuCode", "code": "skuCode",
  "name": "name", "product name": "name", "item name": "name", "compound": "name",
  "alias": "alias", "nickname": "alias", "blend name": "alias",
  "product line": "productLine", "line": "productLine", "category": "productLine",
  "unit": "unit", "uom": "unit",
  "price": "currentPrice", "price (usd)": "currentPrice", "unit price": "currentPrice", "cost": "currentPrice",
  "min qty": "minQuantity", "min quantity": "minQuantity", "minimum": "minQuantity",
  "active": "isActive", "is active": "isActive",
  "tier1 qty": "tier1Qty", "tier 1 qty": "tier1Qty", "tier1qty": "tier1Qty",
  "tier1 price": "tier1Price", "tier 1 price": "tier1Price", "tier1price": "tier1Price",
  "tier2 qty": "tier2Qty", "tier 2 qty": "tier2Qty", "tier2qty": "tier2Qty",
  "tier2 price": "tier2Price", "tier 2 price": "tier2Price", "tier2price": "tier2Price",
  "tier3 qty": "tier3Qty", "tier 3 qty": "tier3Qty", "tier3qty": "tier3Qty",
  "tier3 price": "tier3Price", "tier 3 price": "tier3Price", "tier3price": "tier3Price",
};

interface GlobalSkuRow {
  vendorName: string; skuCode: string; name: string;
  alias?: string | null; productLine?: string | null; unit?: string;
  currentPrice: string; minQuantity?: number; isActive?: boolean;
  tier1Qty?: number | null; tier1Price?: string | null;
  tier2Qty?: number | null; tier2Price?: string | null;
  tier3Qty?: number | null; tier3Price?: string | null;
  _error?: string;
}

function normalizeKey(k: string) { return k.toLowerCase().trim().replace(/[_\-*]/g, " "); }

function parseGlobalRows(raw: Record<string, string>[]): GlobalSkuRow[] {
  return raw.map((r) => {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      const norm = normalizeKey(k);
      const field = IMPORT_ALIASES[norm];
      if (field) mapped[field] = v;
    }
    const vendorName = mapped.vendorName?.trim() ?? "";
    const skuCode = mapped.skuCode?.trim() ?? "";
    const name = mapped.name?.trim() ?? "";
    if (!vendorName || !skuCode || !name) return { vendorName, skuCode, name, currentPrice: "", _error: "Missing vendor, SKU code, or name" };
    const rawPrice = mapped.currentPrice?.replace(/[$,\s]/g, "") ?? "";
    if (!rawPrice || isNaN(parseFloat(rawPrice))) return { vendorName, skuCode, name, currentPrice: "", _error: "Invalid price" };
    const minQty = mapped.minQuantity ? parseInt(mapped.minQuantity, 10) : 1;
    const t1q = mapped.tier1Qty ? parseInt(mapped.tier1Qty, 10) : null;
    const t1p = mapped.tier1Price ? mapped.tier1Price.replace(/[$,\s]/g, "") : null;
    const t2q = mapped.tier2Qty ? parseInt(mapped.tier2Qty, 10) : null;
    const t2p = mapped.tier2Price ? mapped.tier2Price.replace(/[$,\s]/g, "") : null;
    const t3q = mapped.tier3Qty ? parseInt(mapped.tier3Qty, 10) : null;
    const t3p = mapped.tier3Price ? mapped.tier3Price.replace(/[$,\s]/g, "") : null;
    const isActiveRaw = mapped.isActive?.toLowerCase().trim();
    const isActive = isActiveRaw ? !["false", "0", "no", "inactive"].includes(isActiveRaw) : true;
    return {
      vendorName, skuCode, name,
      alias: mapped.alias?.trim() || null,
      productLine: mapped.productLine?.trim() || null,
      unit: mapped.unit?.trim() || "vial",
      currentPrice: parseFloat(rawPrice).toFixed(2),
      minQuantity: isNaN(minQty) ? 1 : minQty,
      isActive,
      tier1Qty: t1q, tier1Price: t1p,
      tier2Qty: t2q, tier2Price: t2p,
      tier3Qty: t3q, tier3Price: t3p,
    };
  });
}

// ─── Global SKU Import Dialog ─────────────────────────────────────────────────
function GlobalSkuImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<GlobalSkuRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const utils = trpc.useUtils();

  const importMutation = trpc.vendors.bulkUpsertSkus.useMutation({
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.added > 0) parts.push(`${data.added} added`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.priceChanges > 0) parts.push(`${data.priceChanges} price change${data.priceChanges !== 1 ? "s" : ""} recorded`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped (unknown vendor)`);
      toast.success(parts.length > 0 ? parts.join(", ") + "." : `${data.total} SKUs processed.`);
      utils.vendors.list.invalidate();
      onImported();
      handleClose();
    },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const handleClose = () => { setRows([]); setFileName(""); setStep("upload"); onOpenChange(false); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true, skipEmptyLines: true,
        complete: (result) => { setRows(parseGlobalRows(result.data)); setStep("preview"); },
        error: (err) => toast.error(`CSV parse error: ${err.message}`),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          setRows(parseGlobalRows(data)); setStep("preview");
        } catch (err: any) { toast.error(`XLSX parse error: ${err.message}`); }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Unsupported file type. Please upload a .csv or .xlsx file.");
    }
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  const handleConfirm = () => {
    if (validRows.length === 0) { toast.error("No valid rows to import."); return; }
    importMutation.mutate({
      rows: validRows.map((r) => ({
        vendorName: r.vendorName,
        skuCode: r.skuCode,
        name: r.name,
        alias: r.alias ?? null,
        productLine: r.productLine ?? null,
        unit: r.unit ?? "vial",
        currentPrice: r.currentPrice,
        minQuantity: r.minQuantity ?? 1,
        isActive: r.isActive !== false,
        tier1Qty: r.tier1Qty ?? null,
        tier1Price: r.tier1Price ?? null,
        tier2Qty: r.tier2Qty ?? null,
        tier2Price: r.tier2Price ?? null,
        tier3Qty: r.tier3Qty ?? null,
        tier3Price: r.tier3Price ?? null,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import / Update All SKUs</DialogTitle>
          <DialogDescription>
            Upload the exported CSV after editing. Rows are matched by <strong>Vendor Name + SKU Code</strong> — existing SKUs are updated, new ones are created.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={28} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Drop your CSV or XLSX here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv and .xlsx files</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
            {/* Expected columns */}
            <div className="bg-muted/30 rounded-lg p-4 text-xs space-y-1">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required columns</p>
              <div className="flex flex-wrap gap-1.5">
                {["Vendor Name", "SKU Code", "Name", "Price (USD)"].map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono">{c}</Badge>
                ))}
              </div>
              <p className="font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-2">Optional columns</p>
              <div className="flex flex-wrap gap-1.5">
                {["Alias", "Product Line", "Unit", "Min Qty", "Active", "Tier1 Qty", "Tier1 Price", "Tier2 Qty", "Tier2 Price", "Tier3 Qty", "Tier3 Price"].map((c) => (
                  <Badge key={c} variant="outline" className="font-mono">{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-3 py-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{fileName}</span>
              <Badge variant="secondary" className="gap-1"><CheckCircle2 size={11} /> {validRows.length} valid</Badge>
              {errorRows.length > 0 && <Badge variant="destructive" className="gap-1"><AlertCircle size={11} /> {errorRows.length} errors</Badge>}
            </div>
            <div className="rounded-lg border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vendor</TableHead>
                    <TableHead className="text-xs">SKU Code</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Alias</TableHead>
                    <TableHead className="text-xs">Price</TableHead>
                    <TableHead className="text-xs">Tiers</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r._error ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs">{r.vendorName}</TableCell>
                      <TableCell className="text-xs font-mono">{r.skuCode}</TableCell>
                      <TableCell className="text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.alias || "—"}</TableCell>
                      <TableCell className="text-xs">{r._error ? "—" : `$${r.currentPrice}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[r.tier1Qty && `@${r.tier1Qty}:$${r.tier1Price}`, r.tier2Qty && `@${r.tier2Qty}:$${r.tier2Price}`, r.tier3Qty && `@${r.tier3Qty}:$${r.tier3Price}`].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r._error
                          ? <span className="text-destructive flex items-center gap-1"><AlertCircle size={11} /> {r._error}</span>
                          : <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={11} /> OK</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <Button variant="outline" onClick={() => { setRows([]); setFileName(""); setStep("upload"); }}>
              ← Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step === "preview" && (
            <Button onClick={handleConfirm} disabled={validRows.length === 0 || importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : `Import ${validRows.length} SKU${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminVendors() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showGlobalImport, setShowGlobalImport] = useState(false);
  const [form, setForm] = useState<CreateVendorForm>(EMPTY_FORM);

  const { data: vendors, isLoading, refetch } = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const exportAllSkusQuery = trpc.vendors.exportAllSkus.useQuery(undefined, { enabled: false });

  const handleExportAllSkus = async () => {
    const result = await exportAllSkusQuery.refetch();
    const rows = result.data;
    if (!rows || rows.length === 0) { toast.error("No SKUs to export."); return; }

    const headers = ["Vendor Name", "SKU Code", "Name", "Alias", "Product Line", "Unit", "Price (USD)", "Min Qty", "Active", "Tier1 Qty", "Tier1 Price", "Tier2 Qty", "Tier2 Price", "Tier3 Qty", "Tier3 Price"];
    const csvRows = rows.map((r) => [
      r.vendorName, r.skuCode, r.name, r.alias ?? "", r.productLine ?? "", r.unit,
      r.currentPrice, r.minQuantity, r.isActive ? "true" : "false",
      r.tier1Qty ?? "", r.tier1Price ?? "", r.tier2Qty ?? "", r.tier2Price ?? "", r.tier3Qty ?? "", r.tier3Price ?? "",
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sku-catalog-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} SKUs.`);
  };

  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: () => { toast.success("Vendor created."); utils.vendors.list.invalidate(); setShowCreate(false); setForm(EMPTY_FORM); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const deactivateMutation = trpc.vendors.deactivate.useMutation({
    onSuccess: () => { toast.success("Vendor deactivated."); utils.vendors.list.invalidate(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const filtered = (vendors ?? []).filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) || v.country.toLowerCase().includes(search.toLowerCase())
  );
  const active = filtered.filter((v) => v.isActive);
  const inactive = filtered.filter((v) => !v.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage supplier catalog — SKUs, pricing, and history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportAllSkus} disabled={exportAllSkusQuery.isFetching}>
            <Download size={14} /> {exportAllSkusQuery.isFetching ? "Exporting..." : "Export All SKUs"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowGlobalImport(true)}>
            <Upload size={14} /> Import / Update SKUs
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={15} /> Add Vendor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Vendor table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : active.length === 0 && inactive.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No vendors yet</p>
          <p className="text-sm mt-1">Add your first vendor to start building a reusable product catalog.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Vendor
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((v) => (
                    <TableRow key={v.id} className="group">
                      <TableCell>
                        <div className="font-semibold text-sm">{v.name}</div>
                        {v.website && (
                          <a href={v.website.startsWith("http") ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                            <Globe size={10} /> {v.website}
                          </a>
                        )}
                      </TableCell>
                      <TableCell><span className="text-sm">{countryDisplay(v.country)}</span></TableCell>
                      <TableCell>
                        <Badge variant={v.country === "US" ? "secondary" : "outline"} className="text-xs">
                          {getLeadTime(v.country)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.contactName && <div>{v.contactName}</div>}
                        {v.contactEmail && <div className="text-xs">{v.contactEmail}</div>}
                        {!v.contactName && !v.contactEmail && "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Deactivate ${v.name}?`)) deactivateMutation.mutate({ id: v.id }); }}>
                            Deactivate
                          </Button>
                          <Link href={`/admin/vendors/${v.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">View Catalog <ChevronRight size={13} /></Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inactive</p>
              <div className="glass-card overflow-hidden opacity-60">
                <Table>
                  <TableBody>
                    {inactive.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium text-sm">{v.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{countryDisplay(v.country)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/vendors/${v.id}`}>
                            <Button variant="outline" size="sm" className="gap-1 ml-2">View <ChevronRight size={13} /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global SKU Import Dialog */}
      <GlobalSkuImportDialog
        open={showGlobalImport}
        onOpenChange={setShowGlobalImport}
        onImported={() => { utils.vendors.list.invalidate(); refetch(); }}
      />

      {/* Create Vendor Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Create a new supplier in the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name *</label>
              <Input className="mt-1" placeholder="e.g. Peptide Sciences" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country *</label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{COUNTRY_MAP[c] ? `${COUNTRY_MAP[c].flag} ${COUNTRY_MAP[c].name}` : c}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Lead time: {getLeadTime(form.country)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
              <Input className="mt-1" placeholder="https://vendor.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Name</label>
                <Input className="mt-1" placeholder="John Smith" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Email</label>
                <Input className="mt-1" placeholder="john@vendor.com" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" rows={2} placeholder="Internal notes about this vendor..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.country || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: form.name, country: form.country, website: form.website || undefined, contactName: form.contactName || undefined, contactEmail: form.contactEmail || undefined, notes: form.notes || undefined })}>
              {createMutation.isPending ? "Creating..." : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
