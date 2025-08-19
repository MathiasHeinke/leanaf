
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";
import { DebugProvider } from "@/contexts/DebugContext";

import { EnhancedSecurityManager } from "@/components/EnhancedSecurityManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Credits from "./pages/Credits";
import CreditsSuccess from "./pages/CreditsSuccess";
import CoachPage from "./pages/Coach";
import TrainingPlus from "./pages/TrainingPlus";
// Momentum page removed - functionality migrated to Index
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
import { GehirnPage } from "./pages/Gehirn";
import TraceDebug from "./pages/TraceDebug";
import TransformationJourneyPage from "./pages/TransformationJourney";

import TestSummaryPage from "./pages/TestSummary";
import { MealInputProvider } from "@/hooks/useGlobalMealInput";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FireBusProvider } from "@/components/FireBackdrop";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={false}
      >
        <TranslationProvider>
          <BrowserRouter>
              <AuthProvider>
                <DebugProvider>
                  <MealInputProvider>
                    <FireBusProvider>
                      <EnhancedSecurityManager>
                      <Sonner />
                      <SidebarProvider>
                        <Layout>
                          <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/credits" element={<Credits />} />
                      <Route path="/credits/success" element={<CreditsSuccess />} />
                      <Route path="/coach" element={<CoachPage />} />
                      <Route path="/coach/:coachId" element={<CoachPage />} />
                      <Route path="/training" element={<TrainingPlus />} />
                      <Route path="/plus" element={<Navigate to="/" replace />} />
                      {/* Momentum route removed - functionality migrated to Index */}
                      
                      <Route path="/transformation" element={<TransformationJourneyPage />} />
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
                      <Route path="/gehirn" element={<GehirnPage />} />
                      <Route path="/test-summary" element={<TestSummaryPage />} />
                      {/* Redirect old subscription route */}
                      <Route path="/subscription" element={<Navigate to="/credits" replace />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                       </Routes>
                     </Layout>
                   </SidebarProvider>
                    </EnhancedSecurityManager>
                    </FireBusProvider>
                  </MealInputProvider>
                </DebugProvider>
              </AuthProvider>
             </BrowserRouter>
           </TranslationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
