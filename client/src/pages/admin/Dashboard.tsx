import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, FlaskConical, Plus, Users } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: summary, isLoading } = trpc.reporting.allBuysSummary.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  const totalBuys = summary?.length ?? 0;
  const activeBuys = summary?.filter((s) => !["Draft", "Complete"].includes(s.buy.status)).length ?? 0;
  const totalMembers = users?.length ?? 0;
  const totalCommitted = summary?.reduce((sum, s) => sum + s.stats.totalCommitted, 0) ?? 0;

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
            { label: "Active Buys", value: activeBuys, icon: <FlaskConical size={16} className="text-blue-400" /> },
            { label: "Members", value: totalMembers, icon: <Users size={16} className="text-violet-400" /> },
            { label: "Total Committed", value: `$${totalCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <BarChart3 size={16} className="text-emerald-400" /> },
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
