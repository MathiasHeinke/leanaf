
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { EnhancedSecurityManager } from "@/components/EnhancedSecurityManager";
import { Layout } from "@/components/Layout";
import { NewLayout } from "@/components/NewLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import CoachPage from "./pages/Coach";
import HistoryPage from "./pages/History";
import Achievements from "./pages/Achievements";
import Science from "./pages/Science";
import NotFound from "./pages/NotFound";
import NewIndex from "./pages/NewIndex";
import NewInsights from "./pages/NewInsights";
import NewCoach from "./pages/NewCoach";
import NewTraining from "./pages/NewTraining";
import NewGoals from "./pages/NewGoals";
import NewAchievements from "./pages/NewAchievements";
import NewSettings from "./pages/NewSettings";

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
                <Routes>
                  {/* New App Structure Routes */}
                  <Route path="/new/*" element={
                    <NewLayout>
                      <Routes>
                        <Route path="/" element={<NewIndex />} />
                        <Route path="/insights" element={<NewInsights />} />
                        <Route path="/coach" element={<NewCoach />} />
                        <Route path="/training" element={<NewTraining />} />
                        <Route path="/goals" element={<NewGoals />} />
                        <Route path="/achievements" element={<NewAchievements />} />
                        <Route path="/settings" element={<NewSettings />} />
                      </Routes>
                    </NewLayout>
                  } />
                  
                  {/* Original App Structure Routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/*" element={
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/subscription" element={<Subscription />} />
                        <Route path="/coach" element={<CoachPage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/achievements" element={<Achievements />} />
                        <Route path="/science" element={<Science />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  } />
                </Routes>
              </BrowserRouter>
            </EnhancedSecurityManager>
          </SubscriptionProvider>
        </AuthProvider>
      </TranslationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
