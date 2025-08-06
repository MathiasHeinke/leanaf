
import React from 'react';
import { useParams } from 'react-router-dom';
import EnhancedUnifiedCoachChat from "@/components/EnhancedUnifiedCoachChat";
import { CoachSelection } from "@/components/CoachSelection";

import { COACH_REGISTRY } from '@/lib/coachRegistry';

// Convert registry to frontend coach profiles
const coachProfiles = Object.values(COACH_REGISTRY).map(coach => ({
  id: coach.id,
  name: coach.displayName,
  personality: coach.personality,
  imageUrl: coach.imageUrl,
  color: coach.color,
  accentColor: coach.accentColor,
  expertise: coach.expertise,
  isFree: coach.isFree,
  isPremium: coach.isPremium
}));

const CoachPage = () => {
  const { coachId } = useParams<{ coachId: string }>();
  
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
      <div className="h-screen relative">
        <EnhancedUnifiedCoachChat
          mode="specialized"
          coach={selectedCoach}
          useFullscreenLayout={true}
          enableAdvancedFeatures={true}
        />
        
      </div>
    );
  }
  
  // Default view: Coach selection only
  return (
    <div className="container mx-auto p-4">
      <CoachSelection />
    </div>
  );
};

export default CoachPage;
