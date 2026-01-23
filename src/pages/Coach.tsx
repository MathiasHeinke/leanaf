
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CoachSelection } from "@/components/CoachSelection";
import { useAuth } from "@/hooks/useAuth";
import AresChat from '@/components/ares/AresChat';

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
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in and trying to access specific coach
  if (coachId && !user) {
    return <Navigate to="/auth" replace />;
  }
  
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
    
    // ARES uses the new streaming chat component
    return (
      <div className="h-screen relative">
        <AresChat 
          userId={user.id}
          coachId="ares"
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
