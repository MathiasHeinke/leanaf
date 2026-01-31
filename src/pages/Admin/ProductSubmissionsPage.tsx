import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductSubmissionsReview } from '@/components/admin/ProductSubmissionsReview';
import { Shield, RefreshCw, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductSubmissionsPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useSecureAdminAccess('admin_panel');

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <CardTitle>Berechtigung wird überprüft...</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Bitte warten Sie, während Ihre Administratorrechte überprüft werden.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Sie haben keine Berechtigung für diese Seite.
            </p>
            {adminError && (
              <p className="text-destructive text-sm">
                Fehler: {adminError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-6 md:px-8 lg:px-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6" />
                Produkt-Einreichungen
              </h1>
              <p className="text-muted-foreground">
                Community-eingereichte Produkte prüfen und freischalten
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ProductSubmissionsReview />
      </div>
    </div>
  );
}
