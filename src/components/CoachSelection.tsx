import React from 'react';
import { CoachCard } from './CoachCard';
import { useCredits } from '@/hooks/useCredits';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { useNavigate } from 'react-router-dom';
import { COACH_REGISTRY, getDefaultCoach } from '@/lib/coachRegistry';

// Single ARES coach profile
const ares = getDefaultCoach();
const coachProfiles = [{
  id: ares.id,
  name: ares.name,
  age: 42,
  role: ares.role,
  avatar: ares.avatar,
  imageUrl: ares.imageUrl,
  personality: ares.personality,
  description: `${ares.role} - ${ares.personality}`,
  strengths: ares.expertise,
  quote: 'ARES optimiert ALLES - Ultimate Coaching Intelligence für totale Dominanz!',
  color: 'red',
  accentColor: ares.accentColor,
  isFree: ares.isFree,
  isPremium: ares.isPremium,
  expertise: ares.expertise,
  quickActions: [
    { text: `${ares.expertise[0]} optimieren`, prompt: `Wie kann ich ${ares.expertise[0]} für bessere Ergebnisse optimieren?` },
    { text: `${ares.expertise[1]} verbessern`, prompt: `Zeige mir Strategien für ${ares.expertise[1]}.` },
    { text: `Persönlicher Plan`, prompt: `Erstelle mir einen personalisierten Plan basierend auf deiner Expertise.` }
  ],
  coachInfo: {
    id: ares.id,
    name: ares.displayName,
    role: ares.role,
    imageUrl: ares.imageUrl,
    avatar: ares.avatar,
    philosophy: `Expertise in ${ares.expertise.join(', ')} mit ${ares.personality}`,
    scientificFoundation: `Spezialisierung auf ${ares.expertise.join(', ')}`,
    specializations: ares.expertise,
    keyMethods: ares.expertise.slice(0, 4),
    evidence: `Evidenzbasierte Methoden für ${ares.expertise.join(', ')}`,
    evidenceBase: `Wissenschaftliche Grundlage in ${ares.expertise.join(', ')}`,
    interventions: ares.expertise.map(e => `${e}-Optimierung`),
    color: 'red'
  }
}];

interface CoachSelectionProps {}

export const CoachSelection: React.FC<CoachSelectionProps> = () => {
  const { status: creditsStatus } = useCredits();
  const { isAdmin: isSuperAdmin, loading: adminLoading } = useSecureAdminAccess();
  const navigate = useNavigate();
  
  const hasFullAccess = !adminLoading && isSuperAdmin;

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {coachProfiles.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            isSelected={false}
            onSelect={() => navigate(`/coach/${coach.id}`)}
            disabled={false}
            requiresPremium={false}
          />
        ))}
      </div>
    </div>
  );
};
