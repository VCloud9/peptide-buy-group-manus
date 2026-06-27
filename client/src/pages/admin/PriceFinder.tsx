import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trophy, TrendingDown, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

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
  name: string;        // canonical compound name (from first row)
  alias: string | null; // friendly nickname e.g. GLOW, KLOW, Wolverine
  rows: SkuResult[];
  bestVendorId: number; // vendorId with lowest ep1
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(price: number): string {
  return `$${price.toFixed(2)}`;
}

function countryFlag(iso: string): string {
  // Convert 2-letter ISO to emoji flag
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function groupByCompound(rows: SkuResult[]): CompoundGroup[] {
  // Group by alias (if set) or normalized compound name (lowercase, trimmed)
  // This means GLOW, KLOW, Wolverine each become their own group
  const map = new Map<string, SkuResult[]>();
  for (const row of rows) {
    // If the row has an alias, group by alias; otherwise group by normalized name
    const key = row.alias ? row.alias.trim().toLowerCase() : row.name.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: CompoundGroup[] = [];
  Array.from(map.values()).forEach((list) => {
    // Sort by ep1 ascending so cheapest is first
    const sorted = [...list].sort((a, b) => a.ep1 - b.ep1);
    const bestVendorId = sorted[0].vendorId;
    // Alias from first row (all rows in a group share the same alias key)
    const alias = list[0].alias ?? null;
    groups.push({ name: list[0].name, alias, rows: sorted, bestVendorId });
  });

  // Sort groups: aliased groups first (alphabetically), then unaliased groups
  return groups.sort((a, b) => {
    if (a.alias && !b.alias) return -1;
    if (!a.alias && b.alias) return 1;
    const aKey = a.alias ?? a.name;
    const bKey = b.alias ?? b.name;
    return aKey.localeCompare(bKey);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tiers, qty }: { tiers: Array<{ minQty: number; price: string }>; qty: number }) {
  const applicable = tiers.filter((t) => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty);
  if (applicable.length === 0) return null;
  return (
    <span className="text-xs text-emerald-400 ml-1">
      (tier @{applicable[0].minQty}+)
    </span>
  );
}

function PriceCell({
  price,
  isBest,
  tiers,
  qty,
  discountPct,
}: {
  price: number;
  isBest: boolean;
  tiers: Array<{ minQty: number; price: string }>;
  qty: number;
  discountPct: string | null;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2 text-right text-sm tabular-nums whitespace-nowrap",
        isBest ? "text-emerald-400 font-semibold" : "text-foreground"
      )}
    >
      {fmt(price)}
      <TierBadge tiers={tiers} qty={qty} />
      {discountPct && (
        <span className="text-xs text-amber-400 ml-1">(-{parseFloat(discountPct)}%)</span>
      )}
    </td>
  );
}

function CompoundTable({ group, bestPrices }: { group: CompoundGroup; bestPrices: { ep1: number; ep10: number; ep20: number; ep50: number } }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden mb-4">
      {/* Compound header */}
      <div className="bg-secondary/40 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Show alias as primary title, full compound name as subtitle */}
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
        {/* SKU code chip */}
        {group.rows[0]?.skuCode && (
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
            {group.rows[0].skuCode}
          </Badge>
        )}
      </div>

      {/* Price table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Vendor</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">List</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty 1</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty 10</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty 20</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty 50</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Savings</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Best</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, idx) => {
              const isBest = row.vendorId === group.bestVendorId;
              const listPrice = parseFloat(row.currentPrice);
              const savings = listPrice > 0 ? ((listPrice - row.ep1) / listPrice) * 100 : 0;
              return (
                <tr
                  key={row.skuId}
                  className={cn(
                    "border-b border-border/50 last:border-0 transition-colors",
                    isBest ? "bg-emerald-950/20" : idx % 2 === 0 ? "bg-background" : "bg-secondary/10"
                  )}
                >
                  {/* Vendor name */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none" title={row.vendorCountry}>
                        {countryFlag(row.vendorCountry)}
                      </span>
                      <a
                        href={`/admin/vendors/${row.vendorId}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {row.vendorName}
                        <ExternalLink size={11} className="text-muted-foreground" />
                      </a>
                      {row.negotiatedDiscountPct && (
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/40 py-0">
                          {parseFloat(row.negotiatedDiscountPct)}% off
                        </Badge>
                      )}
                    </div>
                    {row.productLine && (
                      <div className="text-xs text-muted-foreground mt-0.5 ml-7">{row.productLine}</div>
                    )}
                  </td>

                  {/* List price */}
                  <td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                    {fmt(listPrice)}
                  </td>

                  {/* Effective prices at each qty */}
                  <PriceCell price={row.ep1}  isBest={isBest && row.ep1  === bestPrices.ep1}  tiers={row.tiers} qty={1}  discountPct={row.negotiatedDiscountPct} />
                  <PriceCell price={row.ep10} isBest={isBest && row.ep10 === bestPrices.ep10} tiers={row.tiers} qty={10} discountPct={null} />
                  <PriceCell price={row.ep20} isBest={isBest && row.ep20 === bestPrices.ep20} tiers={row.tiers} qty={20} discountPct={null} />
                  <PriceCell price={row.ep50} isBest={isBest && row.ep50 === bestPrices.ep50} tiers={row.tiers} qty={50} discountPct={null} />

                  {/* Savings */}
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {savings > 0 ? (
                      <span className="text-emerald-400 flex items-center justify-end gap-1">
                        <TrendingDown size={12} />
                        {savings.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Best price badge */}
                  <td className="px-3 py-2 text-center">
                    {isBest && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <Trophy size={12} />
                        Best
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportComparisonCsv(data: SkuResult[], query: string) {
  const headers = [
    "Compound",
    "Vendor",
    "Country",
    "SKU Code",
    "Unit",
    "List Price",
    "Effective @ Qty 1",
    "Effective @ Qty 10",
    "Effective @ Qty 20",
    "Effective @ Qty 50",
    "Negotiated Discount %",
    "Savings % (vs List)",
  ];

  const rows = [...data].sort((a, b) =>
    a.name.localeCompare(b.name) || a.vendorName.localeCompare(b.vendorName)
  );

  const csvRows = rows.map((r) => {
    const listPrice = parseFloat(r.currentPrice);
    const savings = listPrice > 0 ? ((listPrice - r.ep1) / listPrice) * 100 : 0;
    return [
      r.name,
      r.vendorName,
      r.vendorCountry,
      r.skuCode,
      r.unit,
      listPrice.toFixed(2),
      r.ep1.toFixed(2),
      r.ep10.toFixed(2),
      r.ep20.toFixed(2),
      r.ep50.toFixed(2),
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PriceFinder() {
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebounce(rawQuery.trim(), 400);

  const { data, isLoading, isFetching } = trpc.vendors.searchSkus.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  const groups = data ? groupByCompound(data) : [];

  // Compute best price per qty across all groups (for highlighting)
  function getBestPrices(group: CompoundGroup) {
    return {
      ep1:  Math.min(...group.rows.map((r) => r.ep1)),
      ep10: Math.min(...group.rows.map((r) => r.ep10)),
      ep20: Math.min(...group.rows.map((r) => r.ep20)),
      ep50: Math.min(...group.rows.map((r) => r.ep50)),
    };
  }

  const hasResults = groups.length > 0;
  const noResults = query.length >= 2 && !isLoading && !isFetching && !hasResults;

  return (
    <AppLayout showAdmin>
      <div className="container py-8 max-w-5xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Price Finder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search any compound to compare prices across all {7} vendors — including tier discounts and negotiated rates.
          </p>
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
            placeholder="Search compound name… e.g. Retatrutide, BPC-157, Semaglutide"
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
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <Skeleton className="h-10 w-full" />
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && !isFetching && hasResults && (
          <>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-sm text-muted-foreground">
                Found <span className="text-foreground font-medium">{data!.length}</span> SKU
                {data!.length !== 1 ? "s" : ""} across{" "}
                <span className="text-foreground font-medium">{groups.length}</span> compound
                {groups.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportComparisonCsv(data!, query)}
              >
                <Download size={14} />
                Export CSV
              </Button>
            </div>
            {groups.map((group) => (
              <CompoundTable key={group.name} group={group} bestPrices={getBestPrices(group)} />
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

        {/* Empty state — before search */}
        {query.length < 2 && !rawQuery && (
          <div className="text-center py-16 text-muted-foreground">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Start typing to search compounds</p>
            <p className="text-sm mt-1">
              Searches across all 495 SKUs from 7 vendors — including tier pricing and negotiated discounts.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Retatrutide", "BPC-157", "Semaglutide", "Tirzepatide", "TB-500", "CJC-1295", "Ipamorelin"].map((s) => (
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

        {/* Hint when typing but < 2 chars */}
        {rawQuery.length === 1 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Keep typing…
          </div>
        )}
      </div>
    </AppLayout>
  );
}
