
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";

import { EnhancedSecurityManager } from "@/components/EnhancedSecurityManager";
// SidebarProvider moved to Layout.tsx to prevent duplicate renders
import { Layout } from "@/components/Layout";
import AresHome from "./pages/AresHome";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Credits from "./pages/Credits";
import CreditsSuccess from "./pages/CreditsSuccess";
import CoachPage from "./pages/Coach";
import TrainingPlus from "./pages/TrainingPlus";
import HistoryPage from "./pages/History";
import AnalysePage from "./pages/Analyse";
import BackupAnalysePage from "./pages/BackupAnalysePage";
import Achievements from "./pages/Achievements";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Imprint from "./pages/Imprint";
import Marketing from "./pages/Marketing";
import NotFound from "./pages/NotFound";
import { AdminPage } from "./pages/Admin";
import { PersonaEditor } from "./pages/Admin/PersonaEditor";
import ConversationAnalytics from "./pages/Admin/ConversationAnalytics";
import AdminSeedPage from "./pages/AdminSeedPage";
import TransformationJourneyPage from "./pages/TransformationJourney";
import Bloodwork from "./pages/Bloodwork";
import ProtocolPage from "./pages/Protocol";
import RoutinesPage from "./pages/RoutinesPage";
import NutritionPlannerPage from "./pages/NutritionPlannerPage";
import SupplementsPage from "./pages/SupplementsPage";
import PeptidesPage from "./pages/PeptidesPage";
import BioDataPage from "./pages/BioDataPage";
import DashboardPage from "./pages/DashboardPage";
import TrainingPage from "./pages/TrainingPage";
import IntakePage from "./pages/IntakePage";

import { MealInputProvider } from "@/hooks/useGlobalMealInput";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
              <MealInputProvider>
                <EnhancedSecurityManager>
                  <Sonner />
                  <Layout>
                    <Routes>
                      <Route path="/" element={<AresHome />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/credits" element={<Credits />} />
                      <Route path="/credits/success" element={<CreditsSuccess />} />
                      <Route path="/coach" element={<CoachPage />} />
                      <Route path="/coach/:coachId" element={<CoachPage />} />
                      <Route path="/training" element={<TrainingPlus />} />
                      <Route path="/plus" element={<Navigate to="/" replace />} />
                      <Route path="/transformation" element={<TransformationJourneyPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/analyse" element={<AnalysePage />} />
                      <Route path="/backupanalyse" element={<BackupAnalysePage />} />
                      <Route path="/bloodwork" element={<Bloodwork />} />
                      <Route path="/protocol" element={<ProtocolPage />} />
                      <Route path="/routines" element={<RoutinesPage />} />
                      <Route path="/nutrition-planner" element={<NutritionPlannerPage />} />
                      <Route path="/supplements" element={<SupplementsPage />} />
                      <Route path="/peptides" element={<PeptidesPage />} />
                      <Route path="/biodata" element={<BioDataPage />} />
                      <Route path="/protocol/dashboard" element={<DashboardPage />} />
                      <Route path="/protocol/training" element={<TrainingPage />} />
                      <Route path="/protocol/intake" element={<IntakePage />} />
                      <Route path="/achievements" element={<Achievements />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/imprint" element={<Imprint />} />
                      <Route path="/marketing" element={<Marketing />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/admin/personas" element={<PersonaEditor />} />
                      <Route path="/admin/conversation-analytics" element={<ConversationAnalytics />} />
                      <Route path="/admin/seed-supplements" element={<AdminSeedPage />} />
                      {/* Redirect old subscription route */}
                      <Route path="/subscription" element={<Navigate to="/credits" replace />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </EnhancedSecurityManager>
              </MealInputProvider>
            </AuthProvider>
          </BrowserRouter>
        </TranslationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
