import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecializedCoachChat } from '@/components/SpecializedCoachChat';
import { supabase } from '@/integrations/supabase/client';

const TrainingMarkus = () => {
  const navigate = useNavigate();
  const [coachData, setCoachData] = useState<any>(null);

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_specializations')
        .select('*')
        .eq('coach_id', 'markus')
        .single();

      if (error) {
        console.error('Error loading coach data:', error);
        return;
      }

      setCoachData(data);
    } catch (error) {
      console.error('Error in loadCoachData:', error);
    }
  };

  const handleExerciseLogged = () => {
    // Refresh any training data if needed
    console.log('Exercise logged from Markus chat');
  };

  return (
    <div className="h-screen bg-background">
      <SpecializedCoachChat
          coach={{
            id: 'markus',
            name: 'Markus Rühl',
            role: 'Hardcore Bodybuilding-Legende',
            description: 'The German Beast - Schwer und falsch trainieren für maximale Muskelmasse!',
            expertise: ['Hardcore Bodybuilding', 'Heavy Training', 'Volume Training', 'Mental Toughness'],
            personality: 'hart',
            color: 'orange',
            avatar: '/lovable-uploads/e96e839c-c781-4825-bb29-7c45b9febcdf.png',
            age: 51,
            icon: 'dumbbell',
            accentColor: 'from-orange-600 to-red-600',
            quickActions: [
              { text: 'Schwer und falsch!', prompt: 'Erkläre mir das Heavy+Volume Prinzip und wie ich es umsetze.' },
              { text: 'Beast Mode aktivieren', prompt: 'Gib mir mentale Härte und Motivation für ein krasses Training!' },
              { text: 'Muss net schmegge!', prompt: 'Welche Supplements brauche ich für maximale Muskelmasse?' }
            ]
          }}
          onBack={() => navigate('/training')}
          todaysTotals={{ calories: 0, protein: 0, carbs: 0, fats: 0 }}
          dailyGoals={{ calories: 2000, protein: 150, carbs: 250, fats: 65 }}
          averages={{ calories: 0, protein: 0, carbs: 0, fats: 0 }}
          historyData={[]}
          trendData={null}
          weightHistory={[]}
        />
    </div>
  );
};

export default TrainingMarkus;