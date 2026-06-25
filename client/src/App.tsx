import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";

// Member pages
import MemberDashboard from "./pages/member/Dashboard";
import BrowseBuys from "./pages/member/BrowseBuys";
import BuyDetail from "./pages/member/BuyDetail";
import MyOrders from "./pages/member/MyOrders";
import BuyHistory from "./pages/member/BuyHistory";
import Profile from "./pages/member/Profile";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminGroupBuys from "./pages/admin/GroupBuys";
import AdminBuyDetail from "./pages/admin/BuyDetail";
import AdminMembers from "./pages/admin/Members";
import AdminReporting from "./pages/admin/Reporting";
import AdminSettings from "./pages/admin/Settings";
import AdminInviteCodes from "./pages/admin/InviteCodes";

// Gate
import InviteGate from "./components/InviteGate";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />

      {/* Member — gated behind invite code */}
      <Route path="/dashboard">{() => <InviteGate><MemberDashboard /></InviteGate>}</Route>
      <Route path="/buys">{() => <InviteGate><BrowseBuys /></InviteGate>}</Route>
      <Route path="/buys/:id">{() => <InviteGate><BuyDetail /></InviteGate>}</Route>
      <Route path="/my-orders">{() => <InviteGate><MyOrders /></InviteGate>}</Route>
      <Route path="/buy-history">{() => <InviteGate><BuyHistory /></InviteGate>}</Route>
      <Route path="/profile">{() => <InviteGate><Profile /></InviteGate>}</Route>

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/group-buys" component={AdminGroupBuys} />
      <Route path="/admin/group-buys/:id" component={AdminBuyDetail} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/admin/reporting" component={AdminReporting} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/invite-codes" component={AdminInviteCodes} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
