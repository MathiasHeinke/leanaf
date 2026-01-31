import { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProtocolStatus, Phase0Checklist as Phase0ChecklistType } from '@/hooks/useProtocolStatus';
import { usePhase0ItemProgress } from '@/hooks/usePhase0ItemProgress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Skull,
  Cigarette,
  Moon,
  Sparkles,
  Brain,
  Smartphone,
  Dumbbell,
  TrendingDown,
  TestTube,
  Activity,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Phase0ChecklistItem } from './Phase0ChecklistItem';
import { PHASE0_INTRO } from './lifeImpactData';

interface CheckItem {
  key: keyof Phase0ChecklistType;
  title: string;
  description: string;
  icon: React.ElementType;
  autoValidate?: boolean;
}

const CHECKLIST_ITEMS: CheckItem[] = [
  {
    key: 'profile_complete',
    title: 'Profil vollständig',
    description: 'Basisdaten + Lifestyle + Disclaimer ausgefüllt',
    icon: User,
    autoValidate: true
  },
  {
    key: 'toxin_free',
    title: 'Toxin-Frei + Sauna',
    description: 'Kein Rauchen, Alkohol null, kein Plastik/Teflon, Sauna ≥80°C',
    icon: Cigarette,
  },
  {
    key: 'sleep_score',
    title: 'Schlaf-Hygiene',
    description: '≥7h Schlaf, dunkel, kühl (16-18°C)',
    icon: Moon,
    autoValidate: true
  },
  {
    key: 'bio_sanierung',
    title: 'Bio-Sanierung',
    description: 'Zähne saniert, Amalgam entfernt, Clean Beauty',
    icon: Sparkles,
  },
  {
    key: 'psycho_hygiene',
    title: 'Psycho-Hygiene',
    description: 'Safe Haven, keine Energievampire, Stress-Routine',
    icon: Brain,
  },
  {
    key: 'digital_hygiene',
    title: 'Digitale Hygiene',
    description: 'Handyfreies Schlafzimmer, kein Doomscrolling',
    icon: Smartphone,
  },
  {
    key: 'protein_training',
    title: 'Protein & Training',
    description: '≥1.2g/kg Protein + 5× Training ODER 6k Schritte',
    icon: Dumbbell,
    autoValidate: true
  },
  {
    key: 'kfa_trend',
    title: 'KFA-Trend',
    description: '≥3 Messungen, mind. 1× fallend',
    icon: TrendingDown,
    autoValidate: true
  },
  {
    key: 'bloodwork_baseline',
    title: 'Blutwerte-Baseline',
    description: 'Testosteron, E2, Leber, Niere, HbA1c, hsCRP, Hämatokrit',
    icon: TestTube,
    autoValidate: true
  },
  {
    key: 'tracking_measurement',
    title: 'Tracking & Messung',
    description: 'Wearables, Journal, Blut-/Hormontests regelmäßig',
    icon: Activity,
  }
];

const REQUIRED_MARKERS = [
  'total_testosterone', 'estradiol', 'hba1c', 'hscrp', 
  'ast', 'alt', 'ggt', 'creatinine', 'hematocrit'
];

export function Phase0Checklist() {
  const { user } = useAuth();
  const { 
    status, 
    updatePhase0Check,
  } = useProtocolStatus();
  
  const { itemProgress, loading: progressLoading } = usePhase0ItemProgress(status?.phase_0_checklist || null);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);

  // Auto-validate from existing data
  useEffect(() => {
    if (!user?.id || !status) return;
    
    const validateFromData = async () => {
      setValidating(true);
      
      try {
        // 0. Validate Profile Completion
        const { data: profileData } = await supabase
          .from('profiles')
          .select('weight, height, age, gender, activity_level, smoking_status, alcohol_frequency, disclaimer_accepted_at, lifestyle_screening_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          const basicsComplete = !!(profileData.weight && profileData.height && 
                                   profileData.age && profileData.gender && profileData.activity_level);
          const lifestyleComplete = !!profileData.lifestyle_screening_completed;
          const disclaimerAccepted = !!profileData.disclaimer_accepted_at;
          
          const profileComplete = basicsComplete && lifestyleComplete && disclaimerAccepted;
          
          if (profileComplete && !status.phase_0_checklist.profile_complete?.completed) {
            await updatePhase0Check('profile_complete', {
              completed: true,
              basics_done: basicsComplete,
              lifestyle_done: lifestyleComplete,
              disclaimer_accepted: disclaimerAccepted,
              validated_at: new Date().toISOString()
            });
          }
        }

        // 1. Validate Sleep (last 14 days avg)
        const { data: sleepData } = await (supabase as any)
          .from('sleep_tracking')
          .select('sleep_hours')
          .eq('user_id', user.id)
          .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false });
        
        if (sleepData && sleepData.length >= 7) {
          const avgSleep = sleepData.reduce((acc: number, d: any) => acc + (d.sleep_hours || 0), 0) / sleepData.length;
          if (avgSleep >= 7 && !status.phase_0_checklist.sleep_score.completed) {
            await updatePhase0Check('sleep_score', {
              completed: true,
              avg_hours: Math.round(avgSleep * 10) / 10,
              validated_at: new Date().toISOString()
            });
          }
        }

        // 2. Validate Bloodwork Baseline
        const { data: bloodwork } = await supabase
          .from('user_bloodwork')
          .select('*')
          .eq('user_id', user.id)
          .gte('test_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('test_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bloodwork) {
          const presentMarkers = REQUIRED_MARKERS.filter(marker => {
            const value = (bloodwork as any)[marker];
            return value !== null && value !== undefined;
          });
          
          if (presentMarkers.length >= 6 && !status.phase_0_checklist.bloodwork_baseline.completed) {
            await updatePhase0Check('bloodwork_baseline', {
              completed: true,
              markers_present: presentMarkers,
              validated_at: new Date().toISOString()
            });
          }
        }

        // 3. Validate KFA Trend (≥3 Messungen, mind. 1× fallend)
        const { data: weightData } = await (supabase as any)
          .from('weight_history')
          .select('weight, body_fat_percentage, date')
          .eq('user_id', user.id)
          .not('body_fat_percentage', 'is', null)
          .order('date', { ascending: false })
          .limit(10);

        if (weightData && weightData.length >= 3) {
          // Check if ANY measurement shows a downward trend
          let hasAnyDownwardTrend = false;
          for (let i = 0; i < weightData.length - 1; i++) {
            const current = weightData[i].body_fat_percentage;
            const previous = weightData[i + 1].body_fat_percentage;
            if (current && previous && current < previous) {
              hasAnyDownwardTrend = true;
              break;
            }
          }
          
          if (hasAnyDownwardTrend && !status.phase_0_checklist.kfa_trend.completed) {
            const latestKfa = weightData[0].body_fat_percentage;
            const trend = latestKfa < 20 ? 'optimal' : 'improving';
            await updatePhase0Check('kfa_trend', {
              completed: true,
              current_kfa: latestKfa,
              trend,
              validated_at: new Date().toISOString()
            });
          }
        }

      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setValidating(false);
      }
    };

    validateFromData();
  }, [user?.id, status?.id]);

  const toggleItem = (key: string) => {
    setOpenItems(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleManualCheck = async (key: keyof Phase0ChecklistType, completed: boolean) => {
    await updatePhase0Check(key, {
      completed,
      confirmed_at: completed ? new Date().toISOString() : null
    });
    
    if (completed) {
      toast.success('Check bestätigt ✓');
    }
  };

  if (!status) return null;

  const checklist = status.phase_0_checklist;

  return (
    <div className="space-y-4">
      {/* Intro Card - ARES Mentality */}
      <Card className="bg-gradient-to-br from-destructive/10 via-amber-500/10 to-orange-500/10 border-destructive/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <Skull className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">{PHASE0_INTRO.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{PHASE0_INTRO.subtitle}</p>
            </div>
          </div>
          
          {/* Multiplier Formula */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border font-mono text-sm">
            <span className="text-destructive">{PHASE0_INTRO.formula}</span>
          </div>
          
          {/* Main Quote */}
          <CardDescription className="text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{PHASE0_INTRO.mainQuote}</span>
          </CardDescription>
          
          {/* Warning Quote */}
          <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/50 pl-3">
            "{PHASE0_INTRO.warningQuote}"
          </p>
        </CardHeader>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const checkData = checklist[item.key];
          const isCompleted = checkData?.completed;
          const isOpen = openItems.includes(item.key);
          const progress = itemProgress[item.key];
          
          return (
            <Phase0ChecklistItem
              key={item.key}
              item={item}
              progress={progress}
              isCompleted={isCompleted}
              isOpen={isOpen}
              isValidating={validating || progressLoading}
              onToggle={() => toggleItem(item.key)}
              onManualCheck={(completed) => handleManualCheck(item.key, completed)}
            />
          );
        })}
      </div>
    </div>
  );
}
