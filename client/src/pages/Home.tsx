import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import {
  ArrowRight,
  FlaskConical,
  Lock,
  Package,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: activebuys } = trpc.groupBuys.listActive.useQuery();

  const features = [
    {
      icon: <Users size={20} className="text-primary" />,
      title: "Community Pooling",
      desc: "Pool resources with up to 1,500 members to unlock manufacturer-direct pricing unavailable to individual buyers.",
    },
    {
      icon: <ShieldCheck size={20} className="text-primary" />,
      title: "Freedom Diagnostics Testing",
      desc: "Every batch is independently verified by Freedom Diagnostics using HPLC and LC-MS analysis before distribution.",
    },
    {
      icon: <TrendingUp size={20} className="text-primary" />,
      title: "Tiered Participation",
      desc: "Flexible minimum spend tiers let members at every level participate, from entry-level to high-volume buyers.",
    },
    {
      icon: <Package size={20} className="text-primary" />,
      title: "Full Lifecycle Tracking",
      desc: "Track every stage from commitment to your door — payment, testing, and shipment all in one place.",
    },
    {
      icon: <Lock size={20} className="text-primary" />,
      title: "Closed Community",
      desc: "Exclusively for verified Skool community members. Every participant is known and accountable.",
    },
    {
      icon: <FlaskConical size={20} className="text-primary" />,
      title: "Published COA Results",
      desc: "Lab certificates (HPLC/LC-MS) are published to all participants before any product ships.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container h-14 flex items-center justify-between">
          <span className="flex items-center">
            <img src="/manus-storage/pbg-logo_eb506b81.png" alt="Peptide Buy Group" className="h-8 w-auto" />
          </span>
          <div className="flex items-center gap-3">
            {!loading && (
              isAuthenticated ? (
                <Button asChild size="sm">
                  <Link href="/dashboard">Go to Dashboard <ArrowRight size={14} className="ml-1" /></Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <a href={getLoginUrl()}>Sign In <ArrowRight size={14} className="ml-1" /></a>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background pointer-events-none" />
        <div className="relative container py-24 md:py-32 text-center space-y-6">
          {/* Hero logo lockup */}
          <div className="flex justify-center mb-4">
            <img
              src="/manus-storage/pbg-logo_eb506b81.png"
              alt="Peptide Buy Group"
              className="h-16 md:h-20 w-auto"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
            <ShieldCheck size={12} />
            Closed Community — Verified Members Only
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Research Peptides,<br />
            <span className="text-accent">Bought Together.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A private group buying platform for the peptide research community. Pool purchasing power, 
            share testing costs, and receive independently verified product — all tracked in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/buys">Browse Active Buys <ArrowRight size={16} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">My Dashboard</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="lg" className="gap-2">
                <a href={getLoginUrl()}>Sign In to Get Started <ArrowRight size={16} /></a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Active Buys Preview ─────────────────────────────────────────── */}
      {activebuys && activebuys.length > 0 && (
        <section className="container py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Active Group Buys</h2>
              <p className="text-muted-foreground text-sm mt-1">Currently open for commitments</p>
            </div>
            {isAuthenticated && (
              <Button asChild variant="outline" size="sm">
                <Link href="/buys">View All</Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activebuys.slice(0, 3).map((buy) => (
              <div key={buy.id} className="glass-card p-5 space-y-4 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">{buy.title}</h3>
                  <StatusBadge status={buy.status} type="buy" />
                </div>
                {buy.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{buy.description}</p>
                )}
                <MoqProgress current={0} target={parseFloat(buy.moqTarget as string)} />
                {isAuthenticated ? (
                  <Button asChild size="sm" className="w-full" variant="outline">
                    <Link href={`/buys/${buy.id}`}>View Details</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="w-full" variant="outline">
                    <a href={getLoginUrl()}>Sign In to Join</a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="container py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2 text-sm">End-to-end group buy management built for the research community</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Buy Lifecycle ──────────────────────────────────────────────── */}
      <section className="container py-16 border-t border-border">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold">The Buy Lifecycle</h2>
          <p className="text-muted-foreground mt-2 text-sm">Every group buy follows a transparent, structured process</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 items-center">
          {(["Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete"] as const).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <StatusBadge status={s} type="buy" className="text-xs px-3 py-1" />
              {i < arr.length - 1 && <ArrowRight size={14} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>Peptide Buy Group &mdash; For Research Use Only &mdash; Not for Human Consumption</p>
        <p className="mt-1 opacity-60">All products are research-grade only. Participants are responsible for compliance with applicable laws.</p>
      </footer>
    </div>
  );
}
