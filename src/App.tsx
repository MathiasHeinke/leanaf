
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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import CoachPage from "./pages/Coach";
import TrainingPlus from "./pages/TrainingPlus";
import TrainingSascha from "./pages/TrainingSascha";
import TrainingMarkus from "./pages/TrainingMarkus";
import HistoryPage from "./pages/History";
import Achievements from "./pages/Achievements";
import Science from "./pages/Science";
import Features from "./pages/Features";
import Roadmap from "./pages/Roadmap";
import NotFound from "./pages/NotFound";

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
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/coach" element={<CoachPage />} />
                      <Route path="/training" element={<TrainingPlus />} />
                      <Route path="/training/sascha" element={<TrainingSascha />} />
                      <Route path="/training/markus" element={<TrainingMarkus />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/achievements" element={<Achievements />} />
                      <Route path="/science" element={<Science />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/roadmap" element={<Roadmap />} />
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
