import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const memberNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} /> },
  { label: "Browse Buys", href: "/buys", icon: <ShoppingBag size={16} /> },
  { label: "My Orders", href: "/my-orders", icon: <Package size={16} /> },
  { label: "Buy History", href: "/buy-history", icon: <ClipboardList size={16} /> },
];

const adminNav: NavItem[] = [
  { label: "Admin Overview", href: "/admin", icon: <LayoutDashboard size={16} />, adminOnly: true },
  { label: "Group Buys", href: "/admin/group-buys", icon: <FlaskConical size={16} />, adminOnly: true },
  { label: "Members", href: "/admin/members", icon: <Users size={16} />, adminOnly: true },
  { label: "Reporting", href: "/admin/reporting", icon: <BarChart3 size={16} />, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={16} />, adminOnly: true },
  { label: "Invite Codes", href: "/admin/invite-codes", icon: <KeyRound size={16} />, adminOnly: true },
];

interface Props {
  children: React.ReactNode;
  showAdmin?: boolean;
}

export function AppLayout({ children, showAdmin = false }: Props) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      window.location.href = "/";
    },
  });

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const navItems = showAdmin && isAdmin ? adminNav : memberNav;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">You need to sign in to access this page.</p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href={isAdmin && showAdmin ? "/admin" : "/dashboard"}>
            <img src="/manus-storage/pbg-logo-v2_631d4d9d.png" alt="Peptide Buy Group" className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    location === item.href || location.startsWith(item.href + "/")
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {item.icon}
                  {item.label}
                </span>
              </Link>
            ))}
            {/* Skool community link — member view only */}
            {!showAdmin && (
              <a
                href="https://www.skool.com/peptide-buyer-group"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <ExternalLink size={14} />
                Community
              </a>
            )}
            {/* Switch between member/admin */}
            {isAdmin && (
              <Link href={showAdmin ? "/dashboard" : "/admin"}>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Zap size={16} />
                  {showAdmin ? "Member View" : "Admin"}
                </span>
              </Link>
            )}
          </nav>

          {/* Right side: user menu + mobile hamburger */}
          <div className="flex items-center gap-2">
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="hidden sm:block max-w-[120px] truncate">{user?.name ?? user?.email}</span>
                  <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile & Shipping</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-orders">My Orders</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={showAdmin ? "/dashboard" : "/admin"}>
                        {showAdmin ? "Member View" : "Admin Panel"}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger button */}
            <button
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={cn(
          "md:hidden fixed top-14 left-0 right-0 z-30 bg-background border-b border-border shadow-lg transition-all duration-200",
          mobileOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <nav className="container py-3 space-y-0.5">
          {/* Nav items */}
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  location === item.href || location.startsWith(item.href + "/")
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {item.icon}
                {item.label}
              </span>
            </Link>
          ))}

          {/* Community link — member view only */}
          {!showAdmin && (
            <a
              href="https://www.skool.com/peptide-buyer-group"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <ExternalLink size={16} />
              Community (Skool)
            </a>
          )}

          {/* Switch between member/admin */}
          {isAdmin && (
            <>
              <div className="border-t border-border my-1" />
              <Link href={showAdmin ? "/dashboard" : "/admin"}>
                <span className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Zap size={16} />
                  {showAdmin ? "Switch to Member View" : "Switch to Admin Panel"}
                </span>
              </Link>
            </>
          )}

          {/* Sign out */}
          <div className="border-t border-border my-1" />
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Peptide Buy Group &mdash; Research Use Only &mdash; Not for Human Consumption
      </footer>
    </div>
  );
}
