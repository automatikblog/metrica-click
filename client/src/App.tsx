import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Analytics from "@/pages/analytics";
import Integration from "@/pages/integration";
import FacebookSettings from "@/pages/facebook-settings";
import WebhookIntegration from "@/pages/webhook-integration";
import ConversionLogs from "@/pages/conversion-logs";
import ClickLogs from "@/pages/click-logs";
import GeographyAnalytics from "@/pages/geography-analytics";
import Leads from "@/pages/leads";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import AcceptInvitePage from "@/pages/auth/accept-invite";
import TenantSettingsPage from "@/pages/settings/tenant";
import UsersManagementPage from "@/pages/settings/users";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Rotas públicas (sem autenticação)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/accept-invite" component={AcceptInvitePage} />
          <Route component={LoginPage} />
        </Switch>
      </div>
    );
  }

  // Layout principal para usuários autenticados
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Switch>
            <Route path="/" component={() => (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )} />
            <Route path="/campaigns" component={() => (
              <ProtectedRoute requiredRole="editor">
                <Campaigns />
              </ProtectedRoute>
            )} />
            <Route path="/analytics" component={() => (
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            )} />
            <Route path="/integration" component={() => (
              <ProtectedRoute requiredRole="editor">
                <Integration />
              </ProtectedRoute>
            )} />
            <Route path="/webhook" component={() => (
              <ProtectedRoute requiredRole="admin">
                <WebhookIntegration />
              </ProtectedRoute>
            )} />
            <Route path="/conversion-logs" component={() => (
              <ProtectedRoute>
                <ConversionLogs />
              </ProtectedRoute>
            )} />
            <Route path="/click-logs" component={() => (
              <ProtectedRoute>
                <ClickLogs />
              </ProtectedRoute>
            )} />
            <Route path="/geography" component={() => (
              <ProtectedRoute>
                <GeographyAnalytics />
              </ProtectedRoute>
            )} />
            <Route path="/leads" component={() => (
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            )} />
            <Route path="/facebook" component={() => (
              <ProtectedRoute requiredRole="admin">
                <FacebookSettings />
              </ProtectedRoute>
            )} />
            <Route path="/settings/tenant" component={() => (
              <ProtectedRoute requiredRole="admin">
                <TenantSettingsPage />
              </ProtectedRoute>
            )} />
            <Route path="/settings/users" component={() => (
              <ProtectedRoute requiredRole="admin">
                <UsersManagementPage />
              </ProtectedRoute>
            )} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
