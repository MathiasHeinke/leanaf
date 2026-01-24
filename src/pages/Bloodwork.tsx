// Bloodwork Page
// Main page with tabs for dashboard, trends, history, and entry

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BloodworkDashboard } from '@/components/bloodwork/BloodworkDashboard';
import { BloodworkCharts } from '@/components/bloodwork/BloodworkCharts';
import { BloodworkHistory } from '@/components/bloodwork/BloodworkHistory';
import { BloodworkEntry } from '@/components/bloodwork/BloodworkEntry';
import { useBloodwork } from '@/hooks/useBloodwork';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Plus, LayoutDashboard, TrendingUp, History, FileEdit, TestTube, Loader2 } from 'lucide-react';

export default function BloodworkPage() {
  const { user, loading: authLoading } = useAuth();
  const { entries, loading } = useBloodwork();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMarker, setSelectedMarker] = useState<string | undefined>();

  // Handle marker click from dashboard
  const handleMarkerClick = (markerKey: string) => {
    setSelectedMarker(markerKey);
    setActiveTab('trends');
  };

  // Handle successful entry
  const handleEntrySuccess = () => {
    setActiveTab('dashboard');
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-primary" />
            Blutwerte & Hormone
          </h1>
          <p className="text-muted-foreground">
            Tracke deine Laborwerte für optimale Gesundheit
          </p>
        </div>
        <Button onClick={() => setActiveTab('entry')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        /* Tabs */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4 hidden sm:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4 hidden sm:inline" />
              Historie
            </TabsTrigger>
            <TabsTrigger value="entry" className="gap-2">
              <FileEdit className="h-4 w-4 hidden sm:inline" />
              Eintrag
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <BloodworkDashboard 
              entries={entries} 
              onMarkerClick={handleMarkerClick}
            />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <BloodworkCharts 
              entries={entries}
              initialMarker={selectedMarker}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <BloodworkHistory 
              entries={entries}
              onEdit={(entry) => {
                // Could implement edit modal here
                console.log('Edit entry:', entry);
              }}
            />
          </TabsContent>

          <TabsContent value="entry" className="mt-6">
            <BloodworkEntry onSuccess={handleEntrySuccess} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
