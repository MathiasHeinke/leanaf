
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { EnhancedSecurityManager } from "@/components/EnhancedSecurityManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "@/components/Layout";
import { AdminOnboardingAccess } from "@/components/AdminOnboardingAccess";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Onboarding from "./pages/Onboarding";
import CoachPage from "./pages/Coach";
import TrainingPlus from "./pages/TrainingPlus";
import HistoryPage from "./pages/History";
import AnalysePage from "./pages/Analyse";
import BackupAnalysePage from "./pages/BackupAnalysePage";
import Achievements from "./pages/Achievements";
import Science from "./pages/Science";
import Features from "./pages/Features";
import Roadmap from "./pages/Roadmap";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Imprint from "./pages/Imprint";
import Marketing from "./pages/Marketing";
import NotFound from "./pages/NotFound";
import { AdminPage } from "./pages/Admin";
import TraceDebug from "./pages/TraceDebug";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <TranslationProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <EnhancedSecurityManager>
              <Sonner />
              <BrowserRouter>
                <SidebarProvider>
                  <Layout>
                    <AdminOnboardingAccess />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/coach" element={<CoachPage />} />
                      <Route path="/coach/:coachId" element={<CoachPage />} />
                      <Route path="/training" element={<TrainingPlus />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/analyse" element={<AnalysePage />} />
                      <Route path="/backupanalyse" element={<BackupAnalysePage />} />
                      <Route path="/achievements" element={<Achievements />} />
                      <Route path="/science" element={<Science />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/roadmap" element={<Roadmap />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/imprint" element={<Imprint />} />
                      <Route path="/marketing" element={<Marketing />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/debug/trace/:traceId?" element={<TraceDebug />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </SidebarProvider>
              </BrowserRouter>
            </EnhancedSecurityManager>
          </SubscriptionProvider>
        </AuthProvider>
      </TranslationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
