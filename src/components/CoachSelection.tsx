
import React from 'react';
import { CoachCard } from './CoachCard';
import { useCredits } from '@/hooks/useCredits';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { Button } from '@/components/ui/button';
import { Crown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COACH_REGISTRY } from '@/lib/coachRegistry';

// Convert registry to frontend coach profiles  
const coachProfiles = Object.values(COACH_REGISTRY).map(coach => ({
  id: coach.id,
  name: coach.name,
  age: coach.id === 'lucy' ? 29 : coach.id === 'sascha' ? 52 : coach.id === 'kai' ? 35 : coach.id === 'markus' ? 42 : 38,
  role: coach.role,
  avatar: coach.avatar,
  imageUrl: coach.imageUrl,
  personality: coach.personality,
  description: `${coach.role} - ${coach.personality}`,
  strengths: coach.expertise,
  quote: coach.id === 'lucy' ? 'Nachhaltiger Erfolg entsteht durch Balance, nicht durch Perfektion.' :
         coach.id === 'sascha' ? 'Fortschritt entsteht durch intelligente Progression und messbare Anpassungen.' :
         coach.id === 'kai' ? 'Der Geist formt den Körper - mentale Stärke ist der Schlüssel zum Erfolg.' :
         coach.id === 'markus' ? 'Erfolg ist kein Zufall - es ist harte Arbeit, Disziplin und die richtige Einstellung.' :
         'Von der ersten Periode bis zur goldenen Reife – wir trainieren Hormone, Herz & Hirn im Takt des Lebens.',
  color: coach.color,
  accentColor: coach.accentColor,
  isFree: coach.isFree,
  isPremium: coach.isPremium,
  expertise: coach.expertise,
  quickActions: [
    { text: `${coach.expertise[0]} optimieren`, prompt: `Wie kann ich ${coach.expertise[0]} für bessere Ergebnisse optimieren?` },
    { text: `${coach.expertise[1]} verbessern`, prompt: `Zeige mir Strategien für ${coach.expertise[1]}.` },
    { text: `Persönlicher Plan`, prompt: `Erstelle mir einen personalisierten Plan basierend auf deiner Expertise.` }
  ],
  coachInfo: {
    id: coach.id,
    name: coach.displayName,
    role: coach.role,
    imageUrl: coach.imageUrl,
    avatar: coach.avatar,
    philosophy: `Expertise in ${coach.expertise.join(', ')} mit ${coach.personality}`,
    scientificFoundation: `Spezialisierung auf ${coach.expertise.join(', ')}`,
    specializations: coach.expertise,
    keyMethods: coach.expertise.slice(0, 4),
    evidence: `Evidenzbasierte Methoden für ${coach.expertise.join(', ')}`,
    evidenceBase: `Wissenschaftliche Grundlage in ${coach.expertise.join(', ')}`,
    interventions: coach.expertise.map(e => `${e}-Optimierung`),
    color: coach.color
  }
}));

interface CoachSelectionProps {}

export const CoachSelection: React.FC<CoachSelectionProps> = () => {
  const { status: creditsStatus } = useCredits();
  const { isAdmin: isSuperAdmin, loading: adminLoading } = useSecureAdminAccess();
  const navigate = useNavigate();
  
  // Super Admins get all features
  const hasFullAccess = !adminLoading && isSuperAdmin;

  const handleUpgrade = () => {
    navigate('/credits');
  };

  return (
    <div className="space-y-4">

      {/* Credit-based system: no upgrade banner needed */}
      {!hasFullAccess && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  🚀 Über 5+ Experten-Coaches verfügbar
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Upgrade zu Pro für Zugang zu allen Coaches mit einzigartiger Persönlichkeit und tiefem Fachwissen
                </p>
              </div>
            </div>
            <Button 
              onClick={handleUpgrade} 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {coachProfiles.map((coach) => {
          const isLocked = coach.isPremium && !hasFullAccess;
          const isDisabled = isLocked;

          return (
            <CoachCard
              key={coach.id}
              coach={coach}
              isSelected={false}
              onSelect={() => navigate(`/coach/${coach.id}`)}
              disabled={isDisabled}
              requiresPremium={coach.isPremium}
            />
          );
        })}
      </div>

      {/* Coach Coming Soon Section */}
      <div className="mt-8 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-dashed">
        <div className="text-center">
          <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h4 className="font-semibold text-muted-foreground mb-1">Weitere Coaches kommen bald!</h4>
          <p className="text-xs text-muted-foreground">
            Regelmäßig neue Experten mit einzigartigen Persönlichkeiten und Fachbereichen
          </p>
        </div>
      </div>
    </div>
  );
};
