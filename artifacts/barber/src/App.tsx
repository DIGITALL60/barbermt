import { Switch, Route, Router as WouterRouter } from "wouter";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin" component={DashboardPage} />
      <Route path="/admin/appointments" component={AppointmentsPage} />
      <Route path="/admin/barbers" component={BarbersPage} />
      <Route path="/admin/services" component={ServicesPage} />
      <Route path="/admin/schedule" component={SchedulePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
