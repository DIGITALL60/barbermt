import React from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import DashboardPage from "@/pages/admin/dashboard";
import AppointmentsPage from "@/pages/admin/appointments";
import BarbersPage from "@/pages/admin/barbers";
import ServicesPage from "@/pages/admin/services";
import SchedulePage from "@/pages/admin/schedule";
import FinancesPage from "@/pages/admin/finances";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";

const queryClient = new QueryClient();

function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const { authed } = useAdminAuth();
  if (!authed) return <AdminLogin />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin">
        {() => <AdminGuard component={DashboardPage} />}
      </Route>
      <Route path="/admin/appointments">
        {() => <AdminGuard component={AppointmentsPage} />}
      </Route>
      <Route path="/admin/barbers">
        {() => <AdminGuard component={BarbersPage} />}
      </Route>
      <Route path="/admin/services">
        {() => <AdminGuard component={ServicesPage} />}
      </Route>
      <Route path="/admin/schedule">
        {() => <AdminGuard component={SchedulePage} />}
      </Route>
      <Route path="/admin/finances">
        {() => <AdminGuard component={FinancesPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthProvider>
          <Router />
          <Toaster />
        </AdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
