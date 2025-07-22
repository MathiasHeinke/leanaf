
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  BarChart3, 
  Settings, 
  Brain,
  Microscope,
  History,
  User,
  Menu,
  X,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface GlobalHeaderProps {
  onRefresh?: () => void;
}

export const GlobalHeader = ({ onRefresh }: GlobalHeaderProps) => {
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't show header on auth page or for logged out users
  if (location.pathname === '/auth' || !user) {
    return null;
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/coach', label: 'KI-Coach', icon: Brain, badge: 'NEW' },
    { path: '/history', label: 'Verlauf', icon: History },
    { path: '/science', label: 'Studien', icon: Microscope },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-3 max-w-md">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg">KaloAI</span>
            </Link>

            {/* Mobile Menu */}
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col space-y-4 mt-8">
                    {/* Navigation Links */}
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive(item.path)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}

                    {/* Account Links */}
                    <div className="border-t pt-4 space-y-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start px-3 py-2 h-auto"
                      >
                        <span>Sign Out</span>
                      </Button>
                    </div>

                    {/* Subscription Status */}
                    <div className="border-t pt-4">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                          {subscription?.status === 'active' ? 'Premium' : 'Free'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav />
    </>
  );
};

export const FloatingBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on auth page or for logged out users
  if (location.pathname === '/auth' || !user) {
    return null;
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/coach', label: 'Coach', icon: Brain, badge: 'NEW' },
    { path: '/history', label: 'History', icon: History },
    { path: '/account', label: 'Account', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <nav className="glass-card border-2 border-primary/20 rounded-2xl p-2 shadow-2xl">
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-red-500 text-white border-none"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
