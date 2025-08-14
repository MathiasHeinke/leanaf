import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CoachSelection } from '@/components/CoachSelection';
import SimpleUnifiedCoachChat from '@/components/SimpleUnifiedCoachChat';
import { COACH_REGISTRY } from '@/lib/coachRegistry';
import coachPersonasData from '@/data/coach-personas.json';

// Convert registry to frontend coach profiles - Only FREYA and ARES
const coachProfiles = Object.values(COACH_REGISTRY).map(coach => ({
  id: coach.id,
  name: coach.name,
  personality: coach.personality,
  expertise: coach.expertise,
  imageUrl: coach.imageUrl,
  color: coach.color,
  accentColor: coach.accentColor,
  description: `${coach.role} - ${coach.personality}`,
  persona: coachPersonasData.find(p => p.id === coach.prompt_template_id || p.name === coach.name)
}));

const Coach = () => {
  const { coachId } = useParams();

  if (coachId) {
    const coach = coachProfiles.find(c => c.id === coachId);
    if (!coach) {
      return <div>Coach not found</div>;
    }

    return (
      <SimpleUnifiedCoachChat
        mode="specialized"
        coach={coach}
        useFullscreenLayout={true}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <CoachSelection />
    </div>
  );
};

export default Coach;