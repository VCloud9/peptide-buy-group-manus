import { AppLayout } from "@/components/AppLayout";
import { MoqProgress } from "@/components/MoqProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, FlaskConical, Users } from "lucide-react";
import { Link } from "wouter";

export default function BrowseBuys() {
  const { data: buys, isLoading } = trpc.groupBuys.listActive.useQuery();

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Active Group Buys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse open buys and place your commitment
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !buys || buys.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-3">
            <FlaskConical size={40} className="mx-auto text-muted-foreground/40" />
            <p className="font-medium">No active buys right now</p>
            <p className="text-sm text-muted-foreground">
              New group buys are announced in the Skool community. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buys.map((buy) => (
              <div
                key={buy.id}
                className="glass-card p-5 space-y-4 hover:border-primary/40 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                    {buy.title}
                  </h3>
                  <StatusBadge status={buy.status} type="buy" />
                </div>

                {/* Description */}
                {buy.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {buy.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {buy.vendorCountry && (
                    <span className="flex items-center gap-1">
                      <FlaskConical size={11} />
                      {buy.vendorCountry}
                    </span>
                  )}
                  {buy.participantCap && (
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      Cap: {buy.participantCap}
                    </span>
                  )}
                  {buy.endDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Closes {new Date(buy.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* MOQ */}
                <MoqProgress
                  current={0}
                  target={parseFloat(buy.moqTarget as string)}
                />

                {/* CTA */}
                <Button asChild size="sm" className="w-full">
                  <Link href={`/buys/${buy.id}`}>View & Join</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
