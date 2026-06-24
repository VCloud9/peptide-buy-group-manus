import { AppLayout } from "@/components/AppLayout";
import { MoqProgress } from "@/components/MoqProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, FlaskConical, Package, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export default function MemberDashboard() {
  const { data: myOrders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery();
  const { data: activebuys, isLoading: buysLoading } = trpc.groupBuys.listActive.useQuery();

  const pendingOrders = myOrders?.filter((o) => o.status !== "Shipped") ?? [];
  const recentOrders = myOrders?.slice(0, 3) ?? [];

  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your group buy activity at a glance</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Orders</p>
            <p className="text-3xl font-bold tabular-nums">{pendingOrders.length}</p>
          </div>
          <div className="glass-card p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Orders</p>
            <p className="text-3xl font-bold tabular-nums">{myOrders?.length ?? 0}</p>
          </div>
          <div className="glass-card p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Open Buys</p>
            <p className="text-3xl font-bold tabular-nums">{activebuys?.length ?? 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Recent Orders */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Package size={16} className="text-primary" /> My Recent Orders
              </h2>
              <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Link href="/my-orders">View All <ArrowRight size={12} className="ml-1" /></Link>
              </Button>
            </div>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                No orders yet. Browse active buys to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.buy?.title ?? "Group Buy"}</p>
                      <p className="text-xs text-muted-foreground">
                        ${parseFloat(order.totalAmount as string).toFixed(2)} &middot; {order.items?.length ?? 0} item(s)
                      </p>
                    </div>
                    <StatusBadge status={order.status} type="order" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Buys */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <ShoppingBag size={16} className="text-primary" /> Active Group Buys
              </h2>
              <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Link href="/buys">Browse All <ArrowRight size={12} className="ml-1" /></Link>
              </Button>
            </div>
            {buysLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !activebuys || activebuys.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
                No active buys right now. Check back soon.
              </div>
            ) : (
              <div className="space-y-3">
                {activebuys.slice(0, 3).map((buy) => (
                  <Link key={buy.id} href={`/buys/${buy.id}`}>
                    <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{buy.title}</p>
                        <StatusBadge status={buy.status} type="buy" />
                      </div>
                      <MoqProgress
                        current={0}
                        target={parseFloat(buy.moqTarget as string)}
                        showLabel={false}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
