
import React from 'react';
import { useParams } from 'react-router-dom';
import { UnifiedCoachChat } from "@/components/UnifiedCoachChat";
import { CoachSelection } from "@/components/CoachSelection";
import { SingleDaySummaryGenerator } from "@/components/SingleDaySummaryGenerator";
import LiteDebugChat from "@/components/LiteDebugChat";
import { DailySummaryCharts } from "@/components/DailySummaryCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

// Coach profiles data (same as in CoachSelection)
const coachProfiles = [
  {
    id: 'lucy',
    name: 'Lucy',
    personality: 'Ganzheitlich & Empathisch',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    expertise: ['Optimales Timing', 'Intervallfasten', 'Gesunde Gewohnheiten', 'Stoffwechsel'],
    isFree: true
  },
  {
    id: 'sascha',
    name: 'Sascha',
    personality: 'Performance-fokussiert',
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    color: 'blue',
    accentColor: 'from-blue-500 to-blue-600',
    expertise: ['Intelligente Planung', 'Progression', 'Kraftaufbau', 'Performance'],
    isPremium: true
  },
  {
    id: 'kai',
    name: 'Kai',
    personality: 'Achtsam & Strategisch',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    expertise: ['Mentale Stärke', 'Regeneration', 'Schlafqualität', 'Motivation'],
    isPremium: true
  },
  {
    id: 'markus',
    name: 'Markus',
    personality: 'Direkt & Motivierend',
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    expertise: ['Heavy+Volume Training', 'Extreme Hypertrophie', 'Mentale Härte', 'Masseaufbau'],
    isPremium: true
  },
  {
    id: 'dr-vita',
    name: 'Dr. Vita Femina',
    personality: 'Wissenschaftlich & Empathisch',
    imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    expertise: ['Zyklusorientiertes Training', 'Hormonbalance', 'Frauen-Gesundheit', 'Lebensphasen-Coaching'],
    isPremium: true
  }
];

const CoachPage = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14);
  
  // If coachId is provided, find the specific coach and render chat
  if (coachId) {
    const selectedCoach = coachProfiles.find(coach => coach.id === coachId);
    
    if (!selectedCoach) {
      return (
        <div className="container mx-auto p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Coach nicht gefunden</h2>
            <p className="text-muted-foreground">Der angeforderte Coach existiert nicht.</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-screen">
        <UnifiedCoachChat
          mode="specialized"
          coach={selectedCoach}
          useFullscreenLayout={true}
        />
      </div>
    );
  }
  
  // Default view: Coach selection with tabs
  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="summary-charts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary-charts">📊 Summary Trends</TabsTrigger>
          <TabsTrigger value="selection">👥 Coach auswählen</TabsTrigger>
          <TabsTrigger value="lite-debug">⚡ Lite Debug</TabsTrigger>
          <TabsTrigger value="generate">🔍 Tag-Summary Debug</TabsTrigger>
        </TabsList>
        <TabsContent value="summary-charts" className="mt-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Daily Summary Trends</h2>
                <p className="text-muted-foreground">Visualisierung deiner täglichen Fortschritte</p>
              </div>
              <Select 
                value={timeRange.toString()} 
                onValueChange={(value) => setTimeRange(Number(value) as 7 | 14 | 30)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Tage</SelectItem>
                  <SelectItem value="14">14 Tage</SelectItem>
                  <SelectItem value="30">30 Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DailySummaryCharts timeRange={timeRange} />
          </div>
        </TabsContent>
        <TabsContent value="selection" className="mt-6">
          <CoachSelection selectedCoach="lucy" onCoachChange={() => {}} />
        </TabsContent>
        <TabsContent value="lite-debug" className="mt-6">
          <LiteDebugChat />
        </TabsContent>
        <TabsContent value="generate" className="mt-6">
          <SingleDaySummaryGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoachPage;
