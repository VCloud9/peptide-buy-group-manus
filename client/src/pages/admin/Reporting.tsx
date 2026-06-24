import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { BarChart3, Download } from "lucide-react";
import { useState } from "react";

export default function AdminReporting() {
  const { data: summary, isLoading: summaryLoading } = trpc.reporting.allBuysSummary.useQuery();
  const [selectedBuyId, setSelectedBuyId] = useState<string>("");

  const { data: report, isLoading: reportLoading } = trpc.reporting.buyReport.useQuery(
    { groupBuyId: parseInt(selectedBuyId) },
    { enabled: !!selectedBuyId && selectedBuyId !== "" }
  );

  const totalPlatform = summary?.reduce((acc, s) => ({
    committed: acc.committed + s.stats.totalCommitted,
    paid: acc.paid + s.stats.totalPaid,
    participants: acc.participants + s.stats.participantCount,
  }), { committed: 0, paid: 0, participants: 0 });

  return (
    <AppLayout showAdmin>
      <div className="container py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-muted-foreground text-sm mt-1">Financial overview and per-buy order summaries</p>
        </div>

        {/* Platform Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Committed (All Buys)", value: `$${(totalPlatform?.committed ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { label: "Total Paid (All Buys)", value: `$${(totalPlatform?.paid ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { label: "Total Participants", value: totalPlatform?.participants ?? 0 },
          ].map((s) => (
            <div key={s.label} className="glass-card p-5 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* All Buys Summary Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">All Buys Summary</h2>
          </div>
          {summaryLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
            </div>
          ) : !summary || summary.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No data yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Buy</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">MOQ</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Committed</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Paid</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Participants</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Shipped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.map(({ buy, stats }) => (
                    <tr key={buy.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{buy.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={buy.status} type="buy" /></td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        ${parseFloat(buy.moqTarget as string).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        ${stats.totalCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-accent">
                        ${stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{stats.participantCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{stats.shippedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-Buy Drill Down */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm">Per-Buy Order Detail</h2>
            <Select value={selectedBuyId} onValueChange={setSelectedBuyId}>
              <SelectTrigger className="w-64 h-8 text-xs">
                <SelectValue placeholder="Select a buy..." />
              </SelectTrigger>
              <SelectContent>
                {summary?.map(({ buy }) => (
                  <SelectItem key={buy.id} value={String(buy.id)}>{buy.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBuyId && reportLoading && (
            <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
          )}

          {report && (
            <div className="space-y-4">
              {/* Buy header */}
              <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{report.buy.title}</h3>
                    <StatusBadge status={report.buy.status} type="buy" />
                  </div>
                  <MoqProgress
                    current={report.stats.totalCommitted}
                    target={parseFloat(report.buy.moqTarget as string)}
                    className="mt-2 max-w-xs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Committed</p>
                    <p className="font-bold tabular-nums">${report.stats.totalCommitted.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-bold tabular-nums text-accent">${report.stats.totalPaid.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="font-bold tabular-nums text-muted-foreground">
                      ${(report.stats.totalCommitted - report.stats.totalPaid).toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order table */}
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Member</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tracking</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.orders.map(({ order, user }: any) => (
                        <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-xs">{user?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={order.status} type="order" />
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                            ${parseFloat(order.totalAmount as string).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                            {order.trackingNumber ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/10">
                        <td className="px-4 py-2.5 text-xs font-semibold" colSpan={2}>
                          Total ({report.orders.length} orders)
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary">
                          ${report.stats.totalCommitted.toFixed(2)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
