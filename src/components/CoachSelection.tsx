
import React from 'react';
import { CoachCard } from './CoachCard';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Erweiterte Coach-Profile mit neuen Experten
const coachProfiles = [
  {
    id: 'soft',
    name: 'Lucy',
    age: 29,
    role: 'Nutrition & Lifestyle Coach',
    avatar: '❤️',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    personality: 'Ganzheitlich & Empathisch',
    description: 'Unterstützt dich bei einer ausgewogenen Ernährung ohne Verzicht. Zeigt dir, wie du gesunde Gewohnheiten langfristig in deinen Alltag integrierst.',
    strengths: ['Flexible Ernährung', 'Meal Timing', 'Gewohnheitsaufbau', 'Alltagsintegration'],
    quote: 'Nachhaltiger Erfolg entsteht durch Balance, nicht durch Perfektion.',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    isFree: true,
    coachInfo: {
      id: 'soft',
      name: 'Dr. Lucy Martinez',
      role: 'Nutrition & Lifestyle Coach',
      scientificFoundation: 'Ernährungswissenschaften (Ph.D.) mit Fokus auf Chrononutrition, Stoffwechselphysiologie und Verhaltenspsychologie. Spezialisierung auf nachhaltige Ernährungsinterventionen.',
      keyMethods: ['80/20+ Ernährungsprinzip', 'Chrononutritive Strategien', 'Verhaltensmodifikation', 'Lifestyle-Integration'],
      specializations: ['Flexible Ernährungsstrategien', 'Stoffwechseloptimierung', 'Essverhalten & Psychologie', 'Work-Life-Balance'],
      evidence: 'Basiert auf Forschung zu flexiblen Diätansätzen, zirkadianen Rhythmen und langfristiger Gewichtskontrolle ohne restriktive Diäten.',
      interventions: ['Personalisierte Ernährungspläne', 'Habit-Coaching', 'Meal-Timing Optimierung', 'Stress-Management'],
      philosophy: 'Nachhaltiger Lifestyle-Wandel durch Balance, Flexibilität und die Integration gesunder Gewohnheiten in den Alltag.',
      color: 'green'
    }
  },
  {
    id: 'hart',
    name: 'Sascha',
    age: 32,
    role: 'Performance & Training Coach',
    avatar: '🎯',
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    personality: 'Performance-fokussiert',
    description: 'Dein Experte für effektives Krafttraining und Leistungssteigerung. Hilft dir dabei, deine Fitnessziele systematisch und nachhaltig zu erreichen.',
    strengths: ['Trainingsplanung', 'Kraftaufbau', 'Technikverbesserung', 'Fortschrittsmessung'],
    quote: 'Fortschritt entsteht durch intelligente Progression und messbare Anpassungen.',
    color: 'blue',
    accentColor: 'from-blue-500 to-blue-600',
    isPremium: true,
    coachInfo: {
      id: 'hart',
      name: 'Sascha Weber',
      role: 'Performance & Training Coach',
      scientificFoundation: 'Sportwissenschaft (M.Sc.) mit Spezialisierung auf Leistungsphysiologie und biomechanische Bewegungsanalyse. Basiert auf aktueller Forschung zu Kraftentwicklung, Hypertrophie und neuronalen Adaptationen.',
      keyMethods: ['Periodisierte Trainingsplanung', 'Progressive Overload Prinzipien', 'Bewegungsanalyse & Korrektur', 'Leistungsdiagnostik'],
      specializations: ['Krafttraining & Hypertrophie', 'Sportspezifische Konditionierung', 'Verletzungsprävention', 'Wettkampfvorbereitung'],
      evidence: 'Wissenschaftlich fundierte Methoden basierend auf Studien zu Kraftentwicklung, neuronaler Adaptation und optimaler Trainingsfrequenz für verschiedene Populationen.',
      interventions: ['Individualisierte Trainingsprogramme', 'Technikoptimierung', 'Progressions-Tracking', 'Regenerationsmanagement'],
      philosophy: 'Maximale Leistungssteigerung durch systematische, evidenzbasierte Trainingsplanung und kontinuierliche Anpassung an individuelle Fortschritte.',
      color: 'blue'
    }
  },
  {
    id: 'motivierend',
    name: 'Kai',
    age: 35,
    role: 'Mindset & Recovery Coach',
    avatar: '💪',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    personality: 'Achtsam & Strategisch',
    description: 'Hilft dir dabei, mentale Stärke aufzubauen und deine Regeneration zu optimieren. Fokussiert auf Achtsamkeit und nachhaltiges Wohlbefinden.',
    strengths: ['Mentales Training', 'Stressmanagement', 'Schlafoptimierung', 'Achtsamkeit'],
    quote: 'Der Geist formt den Körper - mentale Stärke ist der Schlüssel zum Erfolg.',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    coachInfo: {
      id: 'motivierend',
      name: 'Dr. Kai Nakamura',
      role: 'Mindset & Recovery Coach',
      scientificFoundation: 'Psychologie (Ph.D.) mit Spezialisierung auf Sportpsychologie, Neuroplastizität und kognitive Verhaltenstherapie. Fundament in Neurowissenschaften und Schlafforschung.',
      keyMethods: ['Kognitive Verhaltenstherapie', 'Achtsamkeitstraining', 'Visualisierungstechniken', 'Schlafhygiene-Protokolle'],
      specializations: ['Mentales Training', 'Stressregulation', 'Schlafoptimierung', 'Burnout-Prävention'],
      evidence: 'Wissenschaftlich fundiert durch Forschung zu Neuroplastizität, kognitiver Leistungsfähigkeit und der Verbindung zwischen mentaler Gesundheit und physischer Performance.',
      interventions: ['Personalisierte Mindset-Programme', 'Regenerations-Coaching', 'Stress-Reduktion', 'Performance-Psychologie'],
      philosophy: 'Ganzheitliche Optimierung durch die Verbindung von Geist und Körper, mit Fokus auf nachhaltige mentale Stärke und Resilienz.',
      color: 'purple'
    }
  },
  {
    id: 'markus',
    name: 'Markus',
    age: 42,
    role: 'Bodybuilding & Transformation Coach',
    avatar: '🏆',
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    personality: 'Direkt & Motivierend',
    description: 'Legendärer Bodybuilder und Transformations-Experte. Bringt dich mit seiner direkten Art und jahrzehntelanger Erfahrung zu neuen Höchstleistungen.',
    strengths: ['Muskelaufbau', 'Wettkampfvorbereitung', 'Körpertransformation', 'Mentale Stärke'],
    quote: 'Erfolg ist kein Zufall - es ist harte Arbeit, Disziplin und die richtige Einstellung.',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    isPremium: true,
    coachInfo: {
      id: 'markus',
      name: 'Markus Rühl',
      role: 'Bodybuilding & Transformation Coach',
      scientificFoundation: 'Über 30 Jahre Wettkampferfahrung, IFBB Pro, Mr. Olympia Teilnehmer. Expertise in Hypertrophie, Wettkampfvorbereitung und mentaler Stärke.',
      keyMethods: ['High-Volume Training', 'Periodisierung', 'Wettkampf-Dieting', 'Mentale Konditionierung'],
      specializations: ['Muskelaufbau', 'Contest Prep', 'Transformation Coaching', 'Supplements & Timing'],
      evidence: 'Jahrzehntelange Wettkampferfahrung und erfolgreiche Transformation von hunderten Athleten.',
      interventions: ['Personalisierte Trainingspläne', 'Diät-Coaching', 'Posing-Training', 'Mentale Vorbereitung'],
      philosophy: 'Maximale Ergebnisse durch kompromisslose Disziplin, intelligente Trainingsplanung und mentale Stärke.',
      color: 'red'
    }
  },
  {
    id: 'maria',
    name: 'Dr. Maria',
    age: 36,
    role: 'Metabolismus & Hormon-Expertin',
    avatar: '🧬',
    personality: 'Wissenschaftlich & Präzise',
    description: 'Spezialistin für Stoffwechsel und Hormonoptimierung. Hilft dir dabei, deinen Körper auf biochemischer Ebene zu verstehen und zu optimieren.',
    strengths: ['Hormonbalance', 'Metabolismus', 'Laborwerte', 'Biohacking'],
    quote: 'Dein Körper ist ein komplexes System - verstehe es, und du kontrollierst es.',
    color: 'teal',
    accentColor: 'from-teal-500 to-teal-600',
    isPremium: true
  },
  {
    id: 'sophia',
    name: 'Dr. Sophia Integral',
    age: 42,
    role: 'Integral Theory & Entwicklungscoach',
    avatar: '🌟',
    imageUrl: '/lovable-uploads/fa896878-ee7e-4b4b-9e03-e10d55543ca2.png',
    personality: 'Tiefgreifend & Entwicklungsorientiert',
    description: 'Spezialistin für ganzheitliche Persönlichkeitsentwicklung und Integral Theory. Begleitet dich auf allen Ebenen der persönlichen Evolution.',
    strengths: ['Persönlichkeitsentwicklung', 'Integral Theory', 'Coaching', 'Bewusstseinsentwicklung'],
    quote: 'Wahre Transformation geschieht, wenn wir Körper, Geist und Seele in Einklang bringen.',
    color: 'indigo',
    accentColor: 'from-indigo-500 to-indigo-600',
    isPremium: true,
    coachInfo: {
      id: 'sophia',
      name: 'Dr. Sophia Integral',
      role: 'Integral Theory & Entwicklungscoach',
      scientificFoundation: 'Entwicklungspsychologie (Ph.D.), Integral Theory, Transpersonale Psychologie mit Fokus auf Bewusstseinsentwicklung und Lebensintegration.',
      keyMethods: ['Integral Life Practice', 'Spiral Dynamics', 'Entwicklungspsychologie', 'Holarchische Coaching-Methoden'],
      specializations: ['Persönlichkeitsentwicklung', 'Bewusstseinsarbeit', 'Life Design', 'Transformationale Prozesse'],
      evidence: 'Basiert auf Ken Wilbers Integral Theory, entwicklungspsychologischen Modellen und transpersonaler Forschung zu Bewusstseinsstufen.',
      interventions: ['Integral Assessment', 'Entwicklungsorientiertes Coaching', 'Meditation & Achtsamkeit', 'Lebensvision-Arbeit'],
      philosophy: 'Ganzheitliche Entwicklung auf allen Ebenen - individuell, kollektiv, innerlich und äußerlich für ein authentisches und erfülltes Leben.',
      color: 'indigo'
    }
  },
  {
    id: 'david',
    name: 'David',
    age: 39,
    role: 'Keto & Low-Carb Experte',
    avatar: '🥩',
    personality: 'Fokussiert & Erfahren',
    description: 'Spezialist für ketogene Ernährung und Low-Carb Lifestyle. Zeigt dir, wie du Fett als Energiequelle optimal nutzt.',
    strengths: ['Ketogene Ernährung', 'Intermittent Fasting', 'Metabolische Flexibilität', 'Fettverbrennung'],
    quote: 'Fett ist nicht der Feind - es ist der Schlüssel zu deiner Energie.',
    color: 'amber',
    accentColor: 'from-amber-500 to-amber-600',
    isPremium: true
  },
  {
    id: 'vita',
    name: 'Dr. Vita Femina',
    age: 38,
    role: 'Female Health & Hormone Coach',
    avatar: '🌺',
    imageUrl: '/lovable-uploads/216a2d4a-9390-4203-bb1d-cba4ff7d4cc6.png',
    personality: 'Wissenschaftlich & Empathisch',
    description: 'Expertin für weibliche Gesundheit und hormonelle Balance. Begleitet Frauen durch alle Lebensphasen - vom ersten Zyklus bis zur Menopause.',
    strengths: ['Zyklusbasiertes Training', 'Hormonoptimierung', 'Schwangerschaft & Postpartum', 'Menopause-Support'],
    quote: 'Von der ersten Periode bis zur goldenen Reife – wir trainieren Hormone, Herz & Hirn im Takt des Lebens.',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    coachInfo: {
      id: 'vita',
      name: 'Dr. Vita Femina (Dr. Anna Julia König)',
      role: 'Female Health & Hormone Coach',
      scientificFoundation: 'Endokrinologie, Sportwissenschaft, Gynäkologie, Reha-Medizin mit Fokus auf hormonelle Lebensphasen und evidenzbasierte Trainingssteuerung.',
      keyMethods: ['Zyklus-Sync-Performance', 'Hormonelle Trainingsperiodisierung', 'Lebensphasenadaptierte Ernährung', 'HRV-basierte Belastungssteuerung'],
      specializations: ['Menstruationszyklus-Training', 'Schwangerschaft & Rückbildung', 'Menopause & Knochengesundheit', 'Hormonelle Ernährungsoptimierung'],
      evidence: 'Basiert auf aktueller Forschung zu hormonellen Adaptationen, zyklischen Leistungsschwankungen und geschlechtsspezifischen Trainingsresponses.',
      interventions: ['Zyklusadaptierte Trainingspläne', 'Hormonelle Ernährungsstrategien', 'Lebensphasenangepasste Programme', 'Supplementationsprotokalle'],
      philosophy: 'Jede Lebensphase einer Frau bietet einzigartige Trainings- und Ernährungsfenster. Mit wissenschaftlicher Präzision und empathischer Begleitung maximieren wir diese Potentiale.',
      color: 'purple'
    }
  }
];

interface CoachSelectionProps {
  selectedCoach: string;
  onCoachChange: (coachId: string) => void;
}

export const CoachSelection: React.FC<CoachSelectionProps> = ({ 
  selectedCoach, 
  onCoachChange 
}) => {
  const { isPremium } = useSubscription();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Wähle deinen Coach</h3>
        <p className="text-sm text-muted-foreground">
          {isPremium 
            ? 'Alle Experten-Coaches stehen dir zur Verfügung!' 
            : 'Lucy ist dein kostenloser Coach - oder upgrade für alle Experten!'
          }
        </p>
      </div>

      {/* Premium Upgrade Banner for Free Users */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  🚀 Über 7+ Experten-Coaches verfügbar
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
          const isLocked = coach.isPremium && !isPremium;
          const isDisabled = isLocked;

          return (
            <CoachCard
              key={coach.id}
              coach={coach}
              isSelected={selectedCoach === coach.id}
              onSelect={onCoachChange}
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
