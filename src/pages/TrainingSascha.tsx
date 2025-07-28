import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecializedCoachChat } from '@/components/SpecializedCoachChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, History, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TrainingSascha = () => {
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
        .eq('coach_id', 'sascha')
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
    console.log('Exercise logged from Sascha chat');
  };

  return (
    <div className="h-screen bg-background">
      <SpecializedCoachChat
          coach={{
            id: 'sascha',
            name: 'Sascha',
            role: 'Performance- & Trainingsexperte',
            description: 'Dein persönlicher Trainer für Krafttraining und Performance',
            expertise: ['Krafttraining', 'Performance', 'Trainingsplanung'],
            personality: 'hart',
            color: 'blue',
            avatar: '/lovable-uploads/a684839c-6310-41c3-bd23-9ba6fb3cdf31.png',
            age: 32,
            icon: 'dumbbell',
            accentColor: 'blue',
            quickActions: [
              { text: 'Trainingsplan erstellen', prompt: 'Erstelle mir einen optimalen Trainingsplan für meine Ziele.' },
              { text: 'Formcheck', prompt: 'Bewerte meine Übungsausführung und gib mir Feedback zur Technik.' },
              { text: 'RPE bewerten', prompt: 'Erkläre mir das RPE-System und wie ich es optimal nutze.' }
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

export default TrainingSascha;