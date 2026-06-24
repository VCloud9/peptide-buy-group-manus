import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
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
];

const adminNav: NavItem[] = [
  { label: "Admin Overview", href: "/admin", icon: <LayoutDashboard size={16} />, adminOnly: true },
  { label: "Group Buys", href: "/admin/group-buys", icon: <FlaskConical size={16} />, adminOnly: true },
  { label: "Members", href: "/admin/members", icon: <Users size={16} />, adminOnly: true },
  { label: "Reporting", href: "/admin/reporting", icon: <BarChart3 size={16} />, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={16} />, adminOnly: true },
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
            <img src="/manus-storage/pbg-logo_eb506b81.png" alt="Peptide Buy Group" className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
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

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate">{user?.name ?? user?.email}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
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
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Peptide Buy Group &mdash; Research Use Only &mdash; Not for Human Consumption
      </footer>
    </div>
  );
}
