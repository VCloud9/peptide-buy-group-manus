import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Search, Trophy, ExternalLink, Download, Plus, Minus,
  ShoppingCart, Trash2, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkuResult {
  skuId: number;
  skuCode: string;
  name: string;
  alias: string | null;
  unit: string;
  productLine: string | null;
  currentPrice: string;
  vendorId: number;
  vendorName: string;
  vendorCountry: string;
  negotiatedDiscountPct: string | null;
  tiers: Array<{ minQty: number; price: string }>;
  ep1: number;
  ep10: number;
  ep20: number;
  ep50: number;
}

interface CompoundGroup {
  key: string;          // alias (lowercase) or name (lowercase)
  name: string;         // canonical compound name
  alias: string | null; // friendly nickname e.g. GLOW, KLOW, Wolverine
  rows: SkuResult[];
  bestEp1: number;
}

interface BasketItem {
  skuId: number;
  skuCode: string;
  compoundName: string;
  alias: string | null;
  vendorId: number;
  vendorName: string;
  vendorCountry: string;
  unit: string;
  qty: number;
  pricePerUnit: number; // tier-aware effective price at current qty
  tiers: Array<{ minQty: number; price: string }>;
  negotiatedDiscountPct: string | null;
  basePrice: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(price: number): string {
  return `$${price.toFixed(2)}`;
}

function countryFlag(iso: string): string {
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function calcTierPrice(
  basePrice: string,
  tiers: Array<{ minQty: number; price: string }>,
  qty: number
): number {
  const applicable = tiers
    .filter((t) => qty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty);
  return applicable.length > 0
    ? parseFloat(applicable[0].price)
    : parseFloat(basePrice);
}

function groupByCompound(rows: SkuResult[]): CompoundGroup[] {
  const map = new Map<string, SkuResult[]>();
  for (const row of rows) {
    const key = row.alias ? row.alias.trim().toLowerCase() : row.name.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: CompoundGroup[] = [];
  Array.from(map.entries()).forEach(([key, list]) => {
    const sorted = [...list].sort((a, b) => a.ep1 - b.ep1);
    const bestEp1 = sorted[0].ep1;
    const alias = list[0].alias ?? null;
    groups.push({ key, name: list[0].name, alias, rows: sorted, bestEp1 });
  });

  return groups.sort((a, b) => {
    if (a.alias && !b.alias) return -1;
    if (!a.alias && b.alias) return 1;
    const aKey = a.alias ?? a.name;
    const bKey = b.alias ?? b.name;
    return aKey.localeCompare(bKey);
  });
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportComparisonCsv(data: SkuResult[], query: string) {
  const headers = [
    "Compound", "Vendor", "Country", "SKU Code", "Unit",
    "List Price", "Effective @ Qty 1", "Effective @ Qty 10",
    "Effective @ Qty 20", "Effective @ Qty 50",
    "Negotiated Discount %", "Savings % (vs List)",
  ];
  const rows = [...data].sort((a, b) =>
    a.name.localeCompare(b.name) || a.vendorName.localeCompare(b.vendorName)
  );
  const csvRows = rows.map((r) => {
    const listPrice = parseFloat(r.currentPrice);
    const savings = listPrice > 0 ? ((listPrice - r.ep1) / listPrice) * 100 : 0;
    return [
      r.name, r.vendorName, r.vendorCountry, r.skuCode, r.unit,
      listPrice.toFixed(2), r.ep1.toFixed(2), r.ep10.toFixed(2),
      r.ep20.toFixed(2), r.ep50.toFixed(2),
      r.negotiatedDiscountPct ? parseFloat(r.negotiatedDiscountPct).toFixed(1) : "0",
      savings.toFixed(1),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `price-comparison-${query.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBasketCsv(basket: BasketItem[]) {
  const headers = ["Compound", "Vendor", "Country", "SKU Code", "Unit", "Qty", "Price/Unit", "Line Total"];
  const csvRows = basket.map((item) =>
    [
      item.alias ? `${item.alias} — ${item.compoundName}` : item.compoundName,
      item.vendorName, item.vendorCountry, item.skuCode, item.unit,
      item.qty, item.pricePerUnit.toFixed(2), (item.qty * item.pricePerUnit).toFixed(2),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `basket-order-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Qty Stepper ──────────────────────────────────────────────────────────────

function QtyStepper({
  qty,
  onChange,
  min = 1,
}: {
  qty: number;
  onChange: (qty: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors text-foreground disabled:opacity-40"
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={qty <= min}
      >
        <Minus size={11} />
      </button>
      <span className="w-7 text-center text-sm tabular-nums font-medium">{qty}</span>
      <button
        className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
        onClick={() => onChange(qty + 1)}
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

// ─── Vendor Row ───────────────────────────────────────────────────────────────

function VendorRow({
  row,
  isBest,
  basket,
  onAdd,
  onUpdateQty,
  onRemove,
}: {
  row: SkuResult;
  isBest: boolean;
  basket: BasketItem[];
  onAdd: (row: SkuResult, qty: number) => void;
  onUpdateQty: (skuId: number, qty: number) => void;
  onRemove: (skuId: number) => void;
}) {
  const basketItem = basket.find((b) => b.skuId === row.skuId);
  const isAdded = !!basketItem;
  const [localQty, setLocalQty] = useState(1);

  const displayQty = isAdded ? basketItem!.qty : localQty;
  const effectivePrice = calcTierPrice(row.currentPrice, row.tiers, displayQty);
  const activeTier = row.tiers
    .filter((t) => displayQty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  const handleQtyChange = (newQty: number) => {
    if (isAdded) {
      onUpdateQty(row.skuId, newQty);
    } else {
      setLocalQty(newQty);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 transition-colors",
        isBest && !isAdded ? "bg-emerald-950/15" : "",
        isAdded ? "bg-primary/5 border-l-2 border-l-primary" : ""
      )}
    >
      {/* Vendor info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base leading-none" title={row.vendorCountry}>
            {countryFlag(row.vendorCountry)}
          </span>
          <a
            href={`/admin/vendors/${row.vendorId}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            {row.vendorName}
            <ExternalLink size={10} className="text-muted-foreground" />
          </a>
          {isBest && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <Trophy size={11} />
              Best
            </span>
          )}
          {row.negotiatedDiscountPct && (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/40 py-0 px-1.5">
              {parseFloat(row.negotiatedDiscountPct)}% off
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 ml-6 font-mono">{row.skuCode}</div>
      </div>

      {/* Price + tier info */}
      <div className="text-right shrink-0">
        <div className={cn("text-sm font-semibold tabular-nums", isBest ? "text-emerald-400" : "text-foreground")}>
          {fmt(effectivePrice)}
          <span className="text-xs text-muted-foreground font-normal">/{row.unit}</span>
        </div>
        {activeTier && (
          <div className="text-xs text-emerald-500/80 mt-0.5">tier @{activeTier.minQty}+</div>
        )}
        {!activeTier && row.tiers.length > 0 && (
          <div className="text-xs text-muted-foreground/60 mt-0.5">
            tier @{row.tiers[0].minQty}+: {fmt(parseFloat(row.tiers[0].price))}
          </div>
        )}
      </div>

      {/* Qty stepper */}
      <div className="shrink-0">
        <QtyStepper qty={displayQty} onChange={handleQtyChange} />
      </div>

      {/* Add / Added button */}
      <div className="shrink-0">
        {isAdded ? (
          <button
            onClick={() => onRemove(row.skuId)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:text-destructive transition-colors"
          >
            <span className="text-emerald-400">✓ Added</span>
          </button>
        ) : (
          <Button
            size="sm"
            className="h-7 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => onAdd(row, localQty)}
          >
            <Plus size={12} />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Compound Group Card ──────────────────────────────────────────────────────

function CompoundCard({
  group,
  basket,
  onAdd,
  onUpdateQty,
  onRemove,
}: {
  group: CompoundGroup;
  basket: BasketItem[];
  onAdd: (row: SkuResult, qty: number) => void;
  onUpdateQty: (skuId: number, qty: number) => void;
  onRemove: (skuId: number) => void;
}) {
  const addedCount = group.rows.filter((r) => basket.some((b) => b.skuId === r.skuId)).length;

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden mb-3 transition-colors",
      addedCount > 0 ? "border-primary/40" : "border-border"
    )}>
      {/* Compound header */}
      <div className="bg-secondary/40 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {group.alias ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-primary tracking-wide uppercase">{group.alias}</span>
            <span className="text-xs text-muted-foreground font-normal">{group.name}</span>
          </div>
        ) : (
          <span className="font-semibold text-sm text-foreground">{group.name}</span>
        )}
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {group.rows.length} vendor{group.rows.length !== 1 ? "s" : ""}
        </Badge>
        {group.rows[0]?.unit && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            per {group.rows[0].unit}
          </Badge>
        )}
        {group.rows[0]?.skuCode && (
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
            {group.rows[0].skuCode}
          </Badge>
        )}
        {addedCount > 0 && (
          <Badge className="text-xs bg-primary/20 text-primary border-primary/30 ml-auto">
            {addedCount} added
          </Badge>
        )}
      </div>

      {/* Vendor rows */}
      {group.rows.map((row) => (
        <VendorRow
          key={row.skuId}
          row={row}
          isBest={row.ep1 === group.bestEp1}
          basket={basket}
          onAdd={onAdd}
          onUpdateQty={onUpdateQty}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// ─── Basket Panel ─────────────────────────────────────────────────────────────

function BasketPanel({
  open,
  onClose,
  basket,
  onUpdateQty,
  onRemove,
  onCreateBuy,
  isCreating,
}: {
  open: boolean;
  onClose: () => void;
  basket: BasketItem[];
  onUpdateQty: (skuId: number, qty: number) => void;
  onRemove: (skuId: number) => void;
  onCreateBuy: () => void;
  isCreating: boolean;
}) {
  const total = basket.reduce((sum, item) => sum + item.qty * item.pricePerUnit, 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart size={18} />
            Order Basket
            <Badge className="ml-auto">{basket.length} item{basket.length !== 1 ? "s" : ""}</Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {basket.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              <ShoppingCart size={32} className="mb-2 opacity-30" />
              No items added yet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {basket.map((item) => {
                const lineTotal = item.qty * item.pricePerUnit;
                const activeTier = item.tiers
                  .filter((t) => item.qty >= t.minQty)
                  .sort((a, b) => b.minQty - a.minQty)[0];
                return (
                  <div key={item.skuId} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">
                          {item.alias ? (
                            <span className="text-primary font-bold uppercase">{item.alias}</span>
                          ) : (
                            item.compoundName
                          )}
                        </div>
                        {item.alias && (
                          <div className="text-xs text-muted-foreground">{item.compoundName}</div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {countryFlag(item.vendorCountry)} {item.vendorName}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">{item.skuCode}</span>
                        </div>
                        {activeTier && (
                          <div className="text-xs text-emerald-500 mt-0.5">tier @{activeTier.minQty}+</div>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(item.skuId)}
                        className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <QtyStepper
                        qty={item.qty}
                        onChange={(newQty) => onUpdateQty(item.skuId, newQty)}
                      />
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{fmt(lineTotal)}</div>
                        <div className="text-xs text-muted-foreground">{fmt(item.pricePerUnit)} × {item.qty}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {basket.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Estimated Total</span>
              <span className="text-lg tabular-nums">{fmt(total)}</span>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => exportBasketCsv(basket)}
              >
                <Download size={14} />
                Export CSV
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                onClick={onCreateBuy}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ChevronRight size={14} />
                )}
                Create Buy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Creates a draft buy pre-loaded with these products
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PriceFinder() {
  const [, navigate] = useLocation();
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebounce(rawQuery.trim(), 400);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);

  const { data, isLoading, isFetching } = trpc.vendors.searchSkus.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  const createBuyFromBasket = trpc.groupBuys.createFromBasket.useMutation({
    onSuccess: (result) => {
      toast.success("Draft buy created! Redirecting…");
      navigate(`/admin/buys/${result.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const groups = data ? groupByCompound(data) : [];

  const handleAdd = useCallback((row: SkuResult, qty: number) => {
    const pricePerUnit = calcTierPrice(row.currentPrice, row.tiers, qty);
    setBasket((prev) => {
      const existing = prev.find((b) => b.skuId === row.skuId);
      if (existing) return prev; // already added
      return [
        ...prev,
        {
          skuId: row.skuId,
          skuCode: row.skuCode,
          compoundName: row.name,
          alias: row.alias,
          vendorId: row.vendorId,
          vendorName: row.vendorName,
          vendorCountry: row.vendorCountry,
          unit: row.unit,
          qty,
          pricePerUnit,
          tiers: row.tiers,
          negotiatedDiscountPct: row.negotiatedDiscountPct,
          basePrice: row.currentPrice,
        },
      ];
    });
  }, []);

  const handleUpdateQty = useCallback((skuId: number, qty: number) => {
    setBasket((prev) =>
      prev.map((item) =>
        item.skuId === skuId
          ? { ...item, qty, pricePerUnit: calcTierPrice(item.basePrice, item.tiers, qty) }
          : item
      )
    );
  }, []);

  const handleRemove = useCallback((skuId: number) => {
    setBasket((prev) => prev.filter((b) => b.skuId !== skuId));
  }, []);

  const handleCreateBuy = () => {
    if (basket.length === 0) return;
    createBuyFromBasket.mutate({
      items: basket.map((item) => ({
        vendorSkuId: item.skuId,
        name: item.alias ? `${item.alias} — ${item.compoundName}` : item.compoundName,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit.toFixed(2),
        minQuantity: item.qty,
      })),
    });
  };

  const basketTotal = basket.reduce((sum, item) => sum + item.qty * item.pricePerUnit, 0);
  const hasResults = groups.length > 0;
  const noResults = query.length >= 2 && !isLoading && !isFetching && !hasResults;

  return (
    <AppLayout showAdmin>
      <div className="container py-8 max-w-3xl">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Price Finder</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Search compounds, compare vendors, and build your order basket.
            </p>
          </div>
          {data && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => exportComparisonCsv(data, query)}
            >
              <Download size={14} />
              Export CSV
            </Button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            size={18}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              isFetching ? "text-primary animate-pulse" : "text-muted-foreground"
            )}
          />
          <Input
            autoFocus
            placeholder="Search compound, alias, or SKU code… e.g. GLOW, Retatrutide, RT10"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="pl-10 h-11 text-base bg-secondary/30 border-border focus:border-primary"
          />
          {rawQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
              onClick={() => setRawQuery("")}
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading skeletons */}
        {(isLoading || isFetching) && query.length >= 2 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full mt-px" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && !isFetching && hasResults && (
          <>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{data!.length}</span> SKU
                {data!.length !== 1 ? "s" : ""} across{" "}
                <span className="text-foreground font-medium">{groups.length}</span> compound
                {groups.length !== 1 ? "s" : ""}
              </span>
            </div>
            {groups.map((group) => (
              <CompoundCard
                key={group.key}
                group={group}
                basket={basket}
                onAdd={handleAdd}
                onUpdateQty={handleUpdateQty}
                onRemove={handleRemove}
              />
            ))}
          </>
        )}

        {/* No results */}
        {noResults && (
          <div className="text-center py-16 text-muted-foreground">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium">No compounds found for "{query}"</p>
            <p className="text-sm mt-1">Try a shorter search term or check the spelling.</p>
          </div>
        )}

        {/* Empty state */}
        {query.length < 2 && !rawQuery && (
          <div className="text-center py-16 text-muted-foreground">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Start typing to search compounds</p>
            <p className="text-sm mt-1">
              Searches across all SKUs from all vendors — including tier pricing and negotiated discounts.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["GLOW", "KLOW", "Wolverine", "Retatrutide", "BPC-157", "Semaglutide", "TB-500"].map((s) => (
                <button
                  key={s}
                  onClick={() => setRawQuery(s)}
                  className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {rawQuery.length === 1 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Keep typing…</div>
        )}
      </div>

      {/* Floating basket bar */}
      {basket.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setBasketOpen(true)}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl hover:bg-primary/90 transition-all active:scale-95"
          >
            <ShoppingCart size={18} />
            <span className="font-semibold">
              View basket ({basket.length}) — {fmt(basketTotal)}
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Basket panel */}
      <BasketPanel
        open={basketOpen}
        onClose={() => setBasketOpen(false)}
        basket={basket}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemove}
        onCreateBuy={handleCreateBuy}
        isCreating={createBuyFromBasket.isPending}
      />
    </AppLayout>
  );
}
