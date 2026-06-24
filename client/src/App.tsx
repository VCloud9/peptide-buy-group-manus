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
import Profile from "./pages/member/Profile";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminGroupBuys from "./pages/admin/GroupBuys";
import AdminBuyDetail from "./pages/admin/BuyDetail";
import AdminMembers from "./pages/admin/Members";
import AdminReporting from "./pages/admin/Reporting";
import AdminSettings from "./pages/admin/Settings";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />

      {/* Member */}
      <Route path="/dashboard" component={MemberDashboard} />
      <Route path="/buys" component={BrowseBuys} />
      <Route path="/buys/:id" component={BuyDetail} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/profile" component={Profile} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/group-buys" component={AdminGroupBuys} />
      <Route path="/admin/group-buys/:id" component={AdminBuyDetail} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/admin/reporting" component={AdminReporting} />
      <Route path="/admin/settings" component={AdminSettings} />

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
