import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BarChart3, CheckCircle, FlaskConical, Plus, Users } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: summary, isLoading } = trpc.reporting.allBuysSummary.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  const totalBuys = summary?.length ?? 0;
  const activeBuys = summary?.filter((s) => !["Draft", "Complete"].includes(s.buy.status)).length ?? 0;
  const totalMembers = users?.length ?? 0;
  const totalCommitted = summary?.reduce((sum, s) => sum + s.stats.totalCommitted, 0) ?? 0;
  const totalPendingPayments = summary?.reduce((sum, s) => sum + (s.stats.pendingPaymentCount ?? 0), 0) ?? 0;

  // Buys with at least one pending payment, for the breakdown list
  const buysWithPending = summary?.filter((s) => (s.stats.pendingPaymentCount ?? 0) > 0) ?? [];

  return (
    <AppLayout showAdmin>
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">Platform-wide summary</p>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href="/admin/group-buys">
              <Plus size={14} /> New Group Buy
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Buys", value: totalBuys, icon: <FlaskConical size={16} className="text-primary" /> },
            { label: "Active Buys", value: activeBuys, icon: <FlaskConical size={16} className="text-primary" /> },
            { label: "Members", value: totalMembers, icon: <Users size={16} className="text-accent" /> },
            { label: "Total Committed", value: `$${totalCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <BarChart3 size={16} className="text-accent" /> },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Pending Payments Widget */}
        {isLoading ? (
          <div className="glass-card p-5 h-24 animate-pulse bg-muted/20" />
        ) : totalPendingPayments > 0 ? (
          <div className="glass-card overflow-hidden border border-amber-500/30">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/20 bg-amber-500/5">
              <AlertCircle size={16} className="text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-amber-400">
                  {totalPendingPayments} Payment{totalPendingPayments !== 1 ? "s" : ""} Awaiting Confirmation
                </p>
                <p className="text-xs text-muted-foreground">
                  Members have been sent payment instructions. Confirm receipt in the Orders tab.
                </p>
              </div>
              <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-amber-500 text-white text-sm font-bold">
                {totalPendingPayments}
              </span>
            </div>
            <div className="divide-y divide-border">
              {buysWithPending.map(({ buy, stats }) => (
                <Link key={buy.id} href={`/admin/group-buys/${buy.id}`}>
                  <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{buy.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.pendingPaymentCount} pending &middot; {stats.paidCount} paid &middot; {stats.participantCount} total
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                        {stats.pendingPaymentCount}
                      </span>
                      <StatusBadge status={buy.status} type="buy" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card px-5 py-4 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5">
            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">All payments confirmed — no outstanding orders.</p>
          </div>
        )}

        {/* All Buys Table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-sm">All Group Buys</h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/admin/group-buys">Manage</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />)}
            </div>
          ) : !summary || summary.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No group buys yet. <Link href="/admin/group-buys" className="text-primary underline">Create one</Link>.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.map(({ buy, stats }) => (
                <Link key={buy.id} href={`/admin/group-buys/${buy.id}`}>
                  <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{buy.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.participantCount} participants &middot; ${stats.totalCommitted.toFixed(0)} committed &middot; {stats.paidCount} paid
                        {(stats.pendingPaymentCount ?? 0) > 0 && (
                          <span className="ml-1 text-amber-400 font-medium">
                            &middot; {stats.pendingPaymentCount} pending payment{stats.pendingPaymentCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="hidden sm:block w-40">
                      <MoqProgress
                        current={stats.totalCommitted}
                        target={parseFloat(buy.moqTarget as string)}
                        showLabel={false}
                      />
                    </div>
                    <StatusBadge status={buy.status} type="buy" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
