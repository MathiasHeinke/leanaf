import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Coach from "@/components/Coach";
import BMIProgress from "@/components/BMIProgress";
import History from "@/components/History";
import Profile from "@/pages/Profile";
import Subscription from "@/pages/Subscription";
import { RandomQuote } from "@/components/RandomQuote";
import { populateQuotes } from "@/utils/populateQuotes";
import { 
  Camera, 
  Mic, 
  Type, 
  Plus, 
  Target, 
  Calendar,
  Flame,
  Activity,
  Zap,
  Heart,
  Settings as SettingsIcon,
  History as HistoryIcon,
  MessageCircle,
  Menu,
  User,
  CreditCard,
  LogOut,
  RefreshCw,
  Send,
  StopCircle,
  ImagePlus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Star,
  Sparkles
} from "lucide-react";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr?: number;
  tdee?: number;
}

interface ProfileData {
  weight: number;
  start_weight?: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  target_weight: number;
  target_date?: string;
}

const Index = () => {
  const [inputText, setInputText] = useState("");
  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'coach' | 'history' | 'profile' | 'subscription'>('main');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);
  const [quoteRefreshTrigger, setQuoteRefreshTrigger] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  
  // Safe voice recording hook usage
  const voiceHook = useVoiceRecording();
  const isRecording = voiceHook?.isRecording || false;
  const isProcessing = voiceHook?.isProcessing || false;
  const startRecording = voiceHook?.startRecording || (() => Promise.resolve());
  const stopRecording = voiceHook?.stopRecording || (() => Promise.resolve(null));
  
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Listen for coach navigation event from global header
  useEffect(() => {
    const handleCoachNavigation = () => {
      setCurrentView('coach');
    };
    
    const handleMainNavigation = () => {
      setCurrentView('main');
    };

    const handleHistoryNavigation = () => {
      setCurrentView('history');
    };

    window.addEventListener('navigate-coach', handleCoachNavigation);
    window.addEventListener('navigate-main', handleMainNavigation);
    window.addEventListener('navigate-history', handleHistoryNavigation);

    return () => {
      window.removeEventListener('navigate-coach', handleCoachNavigation);
      window.removeEventListener('navigate-main', handleMainNavigation);
      window.removeEventListener('navigate-history', handleHistoryNavigation);
    };
  }, []);

  // Populate quotes on first load
  useEffect(() => {
    const initializeQuotes = async () => {
      try {
        const result = await populateQuotes();
        if (result.success) {
          console.log('Quotes populated successfully:', result.message);
        } else {
          console.error('Failed to populate quotes:', result.error);
        }
      } catch (error) {
        console.error('Error populating quotes:', error);
      }
    };

    initializeQuotes();
  }, []);

  // Get current weight from weight_history or fallback to profile
  const getCurrentWeight = async () => {
    if (!user) return null;
    
    try {
      const { data: latestWeight } = await supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return latestWeight?.weight || profileData?.weight || null;
    } catch (error) {
      console.error('Error getting current weight:', error);
      return profileData?.weight || null;
    }
  };

  // Calculate BMI progress based on current weight
  const calculateBMIProgress = async () => {
    if (!profileData) return null;
    
    const currentWeight = await getCurrentWeight();
    if (!currentWeight) return null;
    
    const heightInMeters = profileData.height / 100;
    // Ensure we use start_weight for start BMI if available
    const startWeight = profileData.start_weight ?? profileData.weight;
    const startBMI = startWeight / (heightInMeters * heightInMeters);
    const currentBMI = currentWeight / (heightInMeters * heightInMeters);
    const targetBMI = profileData.target_weight / (heightInMeters * heightInMeters);
    
    return {
      start: parseFloat(startBMI.toFixed(1)),
      current: parseFloat(currentBMI.toFixed(1)),
      target: parseFloat(targetBMI.toFixed(1)),
      progress: Math.round(((startBMI - currentBMI) / (startBMI - targetBMI)) * 100)
    };
  };

  // Load weight history
  const loadWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setWeightHistory(data.map(entry => ({
          id: entry.id,
          weight: Number(entry.weight),
          date: entry.date
        })));
      }
    } catch (error: any) {
      console.error('Error loading weight history:', error);
    }
  };

  // Add weight entry
  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(newWeight),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update current weight in profile
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('user_id', user.id);

      setNewWeight('');
      toast.success('Gewicht erfolgreich hinzugefügt!');
      loadWeightHistory();
      
      // Refresh BMI progress
      const newBMIProgress = await calculateBMIProgress();
      setBMIProgress(newBMIProgress);
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    }
  };

  // Delete weight entry
  const handleDeleteWeight = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Gewichtseintrag gelöscht!');
      loadWeightHistory();
      
      // Refresh BMI progress
      const newBMIProgress = await calculateBMIProgress();
      setBMIProgress(newBMIProgress);
    } catch (error: any) {
      console.error('Error deleting weight entry:', error);
      toast.error('Fehler beim Löschen des Gewichtseintrags');
    }
  };

  // Get weight trend
  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stable' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg` };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg` };
  };

  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [bmiProgress, setBMIProgress] = useState<any>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
      loadWeightHistory();
    }
  }, [user]);

  // Load BMI progress when profile data changes
  useEffect(() => {
    if (user && profileData) {
      const loadBMIProgress = async () => {
        const bmiData = await calculateBMIProgress();
        setBMIProgress(bmiData);
      };
      loadBMIProgress();
    }
  }, [user, profileData]);

  // Load user data

  const loadUserData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      
      console.log('Loading user data for user:', user?.id);
      
      // Load profile data first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Profile data loaded:', profileData);

      if (profileData) {
        const profile: ProfileData = {
          weight: Number(profileData.weight) || 70,
          start_weight: Number(profileData.start_weight) || undefined,
          height: Number(profileData.height) || 170,
          age: Number(profileData.age) || 30,
          gender: profileData.gender || 'male',
          activity_level: profileData.activity_level || 'moderate',
          goal: profileData.goal || 'maintain',
          target_weight: Number(profileData.target_weight) || Number(profileData.weight) || 70,
          target_date: profileData.target_date
        };

        setProfileData(profile);

        // Load daily goals from database instead of calculating
        const { data: dailyGoalsData, error: dailyGoalsError } = await supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dailyGoalsError) {
          console.error('Daily goals error:', dailyGoalsError);
          // Fallback to default values if no goals found
          setDailyGoal({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
        } else if (dailyGoalsData) {
          const goals: DailyGoal = {
            calories: Number(dailyGoalsData.calories) || 2000,
            protein: Number(dailyGoalsData.protein) || 150,
            carbs: Number(dailyGoalsData.carbs) || 250,
            fats: Number(dailyGoalsData.fats) || 65,
            bmr: Number(dailyGoalsData.bmr) || undefined,
            tdee: Number(dailyGoalsData.tdee) || undefined,
          };
          
          console.log('Daily goals loaded from database:', goals);
          setDailyGoal(goals);
        }
      }

      // Load today's meals - use user's local timezone
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', startOfTomorrow.toISOString())
        .order('created_at', { ascending: false });

      if (mealsError) {
        console.error('Meals error:', mealsError);
        throw mealsError;
      }

      if (mealsData) {
        const formattedMeals = mealsData.map(meal => ({
          id: meal.id,
          text: meal.text,
          calories: Number(meal.calories),
          protein: Number(meal.protein),
          carbs: Number(meal.carbs),
          fats: Number(meal.fats),
          timestamp: new Date(meal.created_at),
          meal_type: meal.meal_type,
        }));
        setDailyMeals(formattedMeals);
        console.log('Meals loaded:', formattedMeals.length);
      }
      
      if (showRefreshIndicator) {
        toast.success('Daten aktualisiert');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    loadUserData(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      handleManualRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  // Calculate daily totals
  const dailyTotals = dailyMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fats: totals.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const calorieProgress = (dailyTotals.calories / dailyGoal.calories) * 100;
  const proteinProgress = (dailyTotals.protein / dailyGoal.protein) * 100;
  const carbsProgress = (dailyTotals.carbs / dailyGoal.carbs) * 100;
  const fatsProgress = (dailyTotals.fats / dailyGoal.fats) * 100;

  const remainingCalories = dailyGoal.calories - dailyTotals.calories;
  const remainingProtein = dailyGoal.protein - dailyTotals.protein;
  const remainingCarbs = dailyGoal.carbs - dailyTotals.carbs;
  const remainingFats = dailyGoal.fats - dailyTotals.fats;

  // Check if any values are exceeded
  const caloriesExceeded = dailyTotals.calories > dailyGoal.calories;
  const proteinExceeded = dailyTotals.protein > dailyGoal.protein;
  const carbsExceeded = dailyTotals.carbs > dailyGoal.carbs;
  const fatsExceeded = dailyTotals.fats > dailyGoal.fats;

  // Motivational messages
  const getMotivationalMessage = () => {
    const progress = calorieProgress;
    
    if (progress <= 25) {
      return t('motivation.start');
    } else if (progress <= 50) {
      return t('motivation.half');
    } else if (progress <= 75) {
      return t('motivation.progress');
    } else if (progress <= 95) {
      return t('motivation.almost');
    } else if (progress <= 100) {
      return t('motivation.perfect');
    } else {
      return t('motivation.over');
    }
  };

  // Show motivation animation when goals are nearly reached
  useEffect(() => {
    if (calorieProgress >= 90 && calorieProgress <= 100 && !showMotivation) {
      setShowMotivation(true);
      setTimeout(() => setShowMotivation(false), 3000);
    }
  }, [calorieProgress, showMotivation]);

  const handleSubmitMeal = async () => {
    if (!inputText.trim()) {
      toast.error(t('app.error'));
      return;
    }

    setIsAnalyzing(true);
    console.log('Starting meal analysis for:', inputText);
    
    try {
      // Check if there are uploaded images to include in analysis
      const hasImages = uploadedImages.length > 0;
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: inputText,
          images: hasImages ? uploadedImages : undefined
        },
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.total) {
        throw new Error('Invalid response format from analysis service');
      }

      // If images were included, show confirmation dialog instead of directly saving
      if (hasImages) {
        setAnalyzedMealData(data);
        setSelectedMealType(getCurrentMealType());
        setShowConfirmationDialog(true);
      } else {
        // Direct save for text-only meals
        const newMeal = {
          user_id: user?.id,
          text: inputText,
          calories: Math.round(data.total.calories),
          protein: Math.round(data.total.protein),
          carbs: Math.round(data.total.carbs),
          fats: Math.round(data.total.fats),
          meal_type: getCurrentMealType()
        };

        console.log('Inserting meal:', newMeal);

        const { data: insertedMeal, error: insertError } = await supabase
          .from('meals')
          .insert([newMeal])
          .select()
          .single();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }

        console.log('Successfully inserted meal:', insertedMeal);

        const formattedMeal: MealData = {
          id: insertedMeal.id,
          text: insertedMeal.text,
          calories: Number(insertedMeal.calories),
          protein: Number(insertedMeal.protein),
          carbs: Number(insertedMeal.carbs),
          fats: Number(insertedMeal.fats),
          timestamp: new Date(insertedMeal.created_at),
          meal_type: insertedMeal.meal_type,
        };

        setDailyMeals(prev => [formattedMeal, ...prev]);
        setInputText("");
        
        toast.success(t('app.mealAdded'));
      }
    } catch (error: any) {
      console.error('Error analyzing meal:', error);
      toast.error(error.message || t('app.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentMealType = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 19) return "dinner";
    return "snack";
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      console.log('Stopping voice recording...');
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        console.log('Transcribed text added to input:', transcribedText);
      }
    } else {
      console.log('Starting voice recording...');
      await startRecording();
    }
  };


  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    if (files.length > 5) {
      toast.error('Maximal 5 Bilder erlaubt');
      return;
    }
    
    console.log('Starting photo upload with files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    setIsAnalyzing(true);
    toast.info('Lade Bilder hoch...');
    
    try {
      const uploadedUrls: string[] = [];
      
      // Upload each image to Supabase storage
      for (const file of files) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Datei ${file.name} ist zu groß (max. 10MB)`);
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`Datei ${file.name} ist kein Bild`);
        }
        
        console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        console.log('Uploading to storage path:', fileName);
        
        const { data, error } = await supabase.storage
          .from('meal-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        console.log('Upload result:', { data, error });
        
        if (error) {
          console.error('Storage upload error:', error);
          throw new Error(`Upload fehlgeschlagen: ${error.message}`);
        }
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);
        
        console.log('Public URL:', urlData.publicUrl);
        uploadedUrls.push(urlData.publicUrl);
      }
      
      console.log('All uploads completed, URLs:', uploadedUrls);
      setUploadedImages(uploadedUrls);
      
      // Analyze the images
      console.log('Starting image analysis...');
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: inputText || 'Analysiere diese Mahlzeit',
          images: uploadedUrls
        },
      });
      
      console.log('Analysis result:', { data, error });
      
      if (error) {
        console.error('Analysis error:', error);
        throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
      }
      
      if (!data || !data.total) {
        throw new Error('Ungültige Antwort vom Analysedienst');
      }
      
      setAnalyzedMealData(data);
      setSelectedMealType(getCurrentMealType());
      setShowConfirmationDialog(true);
      
    } catch (error: any) {
      console.error('Error in photo upload process:', error);
      toast.error(error.message || 'Fehler beim Hochladen der Bilder');
    } finally {
      setIsAnalyzing(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !analyzedMealData || isVerifying) return;
    
    setIsVerifying(true);
    
    try {
      const userMessage = { role: 'user', content: chatInput };
      const newMessages = [...chatMessages, userMessage];
      setChatMessages(newMessages);
      setChatInput('');
      
      const { data, error } = await supabase.functions.invoke('verify-meal', {
        body: { 
          message: chatInput,
          mealData: {
            calories: analyzedMealData.total.calories,
            protein: analyzedMealData.total.protein,
            carbs: analyzedMealData.total.carbs,
            fats: analyzedMealData.total.fats,
            description: inputText
          },
          conversationHistory: chatMessages
        }
      });
      
      if (error) throw error;
      
      const assistantMessage = { role: 'assistant', content: data.message };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Apply adjustments if needed
      if (data.needsAdjustment && data.adjustments) {
        const updatedMealData = { ...analyzedMealData };
        
        if (data.adjustments.calories !== null) {
          updatedMealData.total.calories = data.adjustments.calories;
        }
        if (data.adjustments.protein !== null) {
          updatedMealData.total.protein = data.adjustments.protein;
        }
        if (data.adjustments.carbs !== null) {
          updatedMealData.total.carbs = data.adjustments.carbs;
        }
        if (data.adjustments.fats !== null) {
          updatedMealData.total.fats = data.adjustments.fats;
        }
        
        setAnalyzedMealData(updatedMealData);
        toast.success('Nährwerte wurden angepasst!');
      }
      
    } catch (error: any) {
      console.error('Error in chat verification:', error);
      toast.error('Fehler beim Chatten mit dem Assistenten');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddMealForDate = (date: string) => {
    console.log('Opening meal dialog for date:', date);
    setSelectedDate(date);
    setShowImageUpload(false);
    setShowConfirmationDialog(true);
    setAnalyzedMealData({
      total: { calories: 0, protein: 0, carbs: 0, fats: 0 }
    });
    setInputText('');
    setUploadedImages([]);
    setChatMessages([]);
    setSelectedMealType('');
  };

  const handleConfirmMeal = async () => {
    if (!inputText.trim() || !analyzedMealData) return;
    
    setIsAnalyzing(true);
    
    try {
      // Save the meal to the database
      const mealDate = selectedDate || new Date().toISOString();
      const mealTitle = analyzedMealData.title || inputText || 'Unbekannte Mahlzeit';
      
      const newMeal = {
        user_id: user?.id,
        text: mealTitle,
        calories: Math.round(analyzedMealData.total.calories),
        protein: Math.round(analyzedMealData.total.protein),
        carbs: Math.round(analyzedMealData.total.carbs),
        fats: Math.round(analyzedMealData.total.fats),
        meal_type: selectedMealType || getCurrentMealType(),
        created_at: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString()
      };

      const { data: insertedMeal, error: insertError } = await supabase
        .from('meals')
        .insert([newMeal])
        .select()
        .single();

      if (insertError) throw insertError;

      // Save image references to meal_images table
      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map(imageUrl => ({
          user_id: user?.id,
          meal_id: insertedMeal.id,
          image_url: imageUrl
        }));

        const { error: imageError } = await supabase
          .from('meal_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Error saving image references:', imageError);
          // Don't throw here, meal was saved successfully
        }
      }

      const formattedMeal: MealData = {
        id: insertedMeal.id,
        text: insertedMeal.text,
        calories: Number(insertedMeal.calories),
        protein: Number(insertedMeal.protein),
        carbs: Number(insertedMeal.carbs),
        fats: Number(insertedMeal.fats),
        timestamp: new Date(insertedMeal.created_at),
        meal_type: insertedMeal.meal_type,
      };

      setDailyMeals(prev => [formattedMeal, ...prev]);
      setInputText("");
      setShowConfirmationDialog(false);
      setAnalyzedMealData(null);
      setUploadedImages([]);
      setChatMessages([]);
      setSelectedDate('');
      
      toast.success('Mahlzeit erfolgreich hinzugefügt!');
      
    } catch (error: any) {
      console.error('Error saving meal:', error);
      toast.error(error.message || 'Fehler beim Speichern der Mahlzeit');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit gelöscht');
      await loadUserData(true);
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Fehler beim Löschen der Mahlzeit');
    }
  };

  const updateMeal = async (mealId: string, updates: Partial<MealData>) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit aktualisiert');
      setEditingMeal(null); // Close modal immediately
      await loadUserData(true);
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Fehler beim Aktualisieren der Mahlzeit');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeal) {
      updateMeal(editingMeal.id, {
        text: editingMeal.text,
        calories: editingMeal.calories,
        protein: editingMeal.protein,
        carbs: editingMeal.carbs,
        fats: editingMeal.fats,
        meal_type: editingMeal.meal_type,
      });
    }
  };

  // Save weight entry
  const saveWeightEntry = async () => {
    if (!user || !weightInput) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('weight_history')
        .upsert({
          user_id: user.id,
          weight: parseFloat(weightInput),
          date: today
        });
      
      if (error) throw error;
      
      toast.success('Gewicht erfolgreich eingetragen!');
      setShowWeightInput(false);
      setWeightInput('');
      
      // Refresh BMI progress
      const newBMIProgress = await calculateBMIProgress();
      setBMIProgress(newBMIProgress);
      
    } catch (error: any) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Render different views
  if (currentView === 'history') {
    return (
      <>
        <History 
          onClose={() => {
            setCurrentView('main');
            loadUserData(true);
          }} 
          dailyGoal={dailyGoal}
          onAddMeal={handleAddMealForDate}
        />
        {/* Meal input dialog for past dates */}
        <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedDate ? `Mahlzeit hinzufügen für ${new Date(selectedDate).toLocaleDateString('de-DE')}` : 'Neue Mahlzeit'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Meal Type Selection */}
              <div>
                <Label htmlFor="meal-type">Mahlzeitentyp</Label>
                <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle einen Mahlzeitentyp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Frühstück</SelectItem>
                    <SelectItem value="lunch">Mittagessen</SelectItem>
                    <SelectItem value="dinner">Abendessen</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="other">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text Input */}
              <div>
                <Label>Beschreibung der Mahlzeit</Label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Beschreibe deine Mahlzeit hier..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowImageUpload(true)}
                  className="flex-1"
                  disabled={uploadedImages.length >= 5}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Foto ({uploadedImages.length}/5)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {/* Voice recording logic */}}
                  className="flex-1"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Sprache
                </Button>
                <Button
                  onClick={async () => {
                    if (!inputText.trim()) return;
                    setIsAnalyzing(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('analyze-meal', {
                        body: { 
                          text: inputText,
                          images: uploadedImages
                        }
                      });
                      if (error) throw error;
                      setAnalyzedMealData(data);
                    } catch (error) {
                      console.error('Error analyzing meal:', error);
                      toast.error('Fehler bei der Analyse');
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Analysieren
                </Button>
              </div>

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Hochgeladene Bilder</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={imageUrl} 
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {analyzedMealData && (
                <div className="space-y-4 p-4 bg-accent/20 rounded-lg">
                  <h3 className="font-semibold">Analyseergebnis</h3>
                  
                  {/* Nutritional Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kalorien</Label>
                      <div className="text-lg font-bold">{Math.round(analyzedMealData.total?.calories || 0)} kcal</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Protein</Label>
                      <div className="text-lg font-bold text-protein">{Math.round(analyzedMealData.total?.protein || 0)}g</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Kohlenhydrate</Label>
                      <div className="text-lg font-bold text-carbs">{Math.round(analyzedMealData.total?.carbs || 0)}g</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fette</Label>
                      <div className="text-lg font-bold text-fats">{Math.round(analyzedMealData.total?.fats || 0)}g</div>
                    </div>
                  </div>

                  {/* Chat Interface for Adjustments */}
                  <div className="space-y-3">
                    <Label>Chat mit KI-Assistent</Label>
                    <div className="max-h-32 overflow-y-auto space-y-2 p-2 bg-background/50 rounded">
                      {chatMessages.map((msg, index) => (
                        <div key={index} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          <span className={`inline-block p-2 rounded ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            {msg.content}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Frage zur Mahlzeit..."
                        onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                      />
                      <Button onClick={handleChatSubmit} disabled={isVerifying}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowConfirmationDialog(false);
                    setAnalyzedMealData(null);
                    setInputText('');
                    setUploadedImages([]);
                    setChatMessages([]);
                    setSelectedDate('');
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleConfirmMeal}
                  disabled={!analyzedMealData || isAnalyzing}
                  className="flex-1"
                >
                  Mahlzeit hinzufügen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Upload Dialog */}
        <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bilder hochladen ({uploadedImages.length}/5)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const remainingSlots = 5 - uploadedImages.length;
                    const filesToUpload = files.slice(0, remainingSlots);
                    
                    for (const file of filesToUpload) {
                      try {
                        toast.info(`Lade Bild hoch: ${file.name}`);
                        
                        // Generate unique filename
                        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        
                        // Upload to Supabase Storage
                        const { data, error } = await supabase.storage
                          .from('meal-images')
                          .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false
                          });
                        
                        if (error) {
                          console.error('Upload error:', error);
                          throw error;
                        }
                        
                        // Get public URL
                        const { data: { publicUrl } } = supabase.storage
                          .from('meal-images')
                          .getPublicUrl(fileName);
                        
                        console.log('Image uploaded successfully:', publicUrl);
                        setUploadedImages(prev => [...prev, publicUrl]);
                        toast.success(`${file.name} erfolgreich hochgeladen!`);
                        
                      } catch (error) {
                        console.error('Error uploading image:', error);
                        toast.error(`Fehler beim Hochladen von ${file.name}: ${error.message}`);
                      }
                    }
                    
                    if (files.length > remainingSlots) {
                      toast.warning(`Nur ${remainingSlots} Bilder konnten hochgeladen werden (Maximum: 5)`);
                    }
                    
                    // Reset input
                    e.target.value = '';
                    
                    // Close dialog if we have images
                    if (uploadedImages.length > 0 || filesToUpload.length > 0) {
                      setShowImageUpload(false);
                    }
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <label 
                  htmlFor="image-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <ImagePlus className="h-12 w-12 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Klicken Sie hier, um bis zu {5 - uploadedImages.length} Bilder auszuwählen
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Unterstützte Formate: JPG, PNG, WEBP
                  </div>
                </label>
              </div>
              
              {uploadedImages.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Hochgeladene Bilder ({uploadedImages.length}/5)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={imageUrl} 
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl);
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            try {
                              // Extract filename from URL for deletion
                              const url = new URL(imageUrl);
                              const fileName = url.pathname.split('/').pop();
                              
                              if (fileName) {
                                await supabase.storage
                                  .from('meal-images')
                                  .remove([fileName]);
                              }
                              
                              setUploadedImages(prev => prev.filter((_, i) => i !== index));
                              toast.success('Bild gelöscht');
                            } catch (error) {
                              console.error('Error deleting image:', error);
                              // Remove from UI even if backend deletion fails
                              setUploadedImages(prev => prev.filter((_, i) => i !== index));
                              toast.warning('Bild aus Liste entfernt (Server-Fehler ignoriert)');
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowImageUpload(false)}
                  className="flex-1"
                >
                  Schließen
                </Button>
                {uploadedImages.length > 0 && (
                  <Button 
                    onClick={() => setShowImageUpload(false)}
                    className="flex-1"
                  >
                    Fertig ({uploadedImages.length} Bilder)
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (currentView === 'coach') {
    return (
      <Coach onClose={() => setCurrentView('main')} />
    );
  }

  if (currentView === 'profile') {
    return (
      <Profile onClose={() => {
        setCurrentView('main');
        loadUserData(true);
      }} />
    );
  }

  if (currentView === 'subscription') {
    return (
      <Subscription onClose={() => setCurrentView('main')} />
    );
  }

  // Always use the global header, but pass specific props for the main view
  return (
    <div className="max-w-sm mx-auto px-4">
      {/* Motivation Animation */}
      {showMotivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg text-lg font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Fast geschafft! 🎯
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
      )}
      
        <Card className="p-4 mb-4 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t('app.dailyProgress')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Warning for exceeded calories */}
          {caloriesExceeded && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm font-medium">
                {language === 'de' 
                  ? `Achtung: Du hast dein Kalorienziel um ${Math.abs(remainingCalories)} kcal überschritten!`
                  : `Warning: You have exceeded your calorie goal by ${Math.abs(remainingCalories)} kcal!`
                }
              </span>
            </div>
          )}
          
          {/* Calorie Progress with enhanced visualization */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('app.calories')}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${caloriesExceeded ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                  {dailyTotals.calories}/{dailyGoal.calories} kcal
                </span>
                {remainingCalories > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Progress 
              value={Math.min(calorieProgress, 100)} 
              className={`h-3 mb-2 ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
            />
            <div className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" />
               <span className={remainingCalories > 0 ? "text-green-600" : "text-red-600"}>
                 {remainingCalories > 0 
                   ? `${remainingCalories} ${t('ui.kcal')} ${t('ui.remaining')}`
                   : `${Math.abs(remainingCalories)} ${t('ui.kcal')} ${t('ui.overGoal')}`
                 }
               </span>
            </div>
          </div>

          {/* Enhanced Macro Overview with progress and red indicators */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`text-center p-2 rounded-xl border ${proteinExceeded ? 'bg-red-50 border-red-200' : 'bg-protein-light border-protein/20'}`}>
              <div className={`text-xs font-medium mb-1 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>{t('app.protein')}</div>
              <div className={`font-bold mb-2 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>{dailyTotals.protein}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(proteinProgress, 100)} 
                className={`h-1 mb-1 ${proteinExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${proteinExceeded ? 'text-red-600 font-bold' : 'text-protein/70'}`}>
                {remainingProtein > 0 ? `+${remainingProtein}${t('ui.gram')}` : `${Math.abs(remainingProtein)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
            <div className={`text-center p-2 rounded-xl border ${carbsExceeded ? 'bg-red-50 border-red-200' : 'bg-carbs-light border-carbs/20'}`}>
              <div className={`text-xs font-medium mb-1 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>{t('app.carbs')}</div>
              <div className={`font-bold mb-2 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>{dailyTotals.carbs}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(carbsProgress, 100)} 
                className={`h-1 mb-1 ${carbsExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${carbsExceeded ? 'text-red-600 font-bold' : 'text-carbs/70'}`}>
                {remainingCarbs > 0 ? `+${remainingCarbs}${t('ui.gram')}` : `${Math.abs(remainingCarbs)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
            <div className={`text-center p-2 rounded-xl border ${fatsExceeded ? 'bg-red-50 border-red-200' : 'bg-fats-light border-fats/20'}`}>
              <div className={`text-xs font-medium mb-1 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>{t('app.fats')}</div>
              <div className={`font-bold mb-2 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>{dailyTotals.fats}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(fatsProgress, 100)} 
                className={`h-1 mb-1 ${fatsExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${fatsExceeded ? 'text-red-600 font-bold' : 'text-fats/70'}`}>
                {remainingFats > 0 ? `+${remainingFats}${t('ui.gram')}` : `${Math.abs(remainingFats)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
          </div>

          {/* Motivational message */}
          <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Star className="h-4 w-4" />
              {getMotivationalMessage()}
            </div>
          </div>

          {/* Quick Weight Input */}
          <div className="mt-4">
            <Card className="p-4 border-primary/20">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeight();
                    }
                  }}
                  placeholder="Aktuelles Gewicht"
                  className="flex-1"
                />
                <Button onClick={handleAddWeight} disabled={!newWeight}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eintragen
                </Button>
              </div>
              {(() => {
                const trend = getWeightTrend();
                if (!trend) return null;
                const IconComponent = trend.icon;
                return (
                  <div className={`flex items-center gap-1 ${trend.color} text-sm mt-2`}>
                    <IconComponent className="h-4 w-4" />
                    <span>{trend.text}</span>
                  </div>
                );
              })()}
            </Card>
          </div>

          {/* Quote Section */}
          <div className="mt-4">
            <RandomQuote 
              userGender={profileData?.gender} 
              fallbackText=""
              refreshTrigger={quoteRefreshTrigger}
            />
          </div>
        </Card>

        {/* ChatGPT-style Input */}
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="max-w-sm mx-auto">
            <Card className="p-3 shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur">
              <div className="flex items-end gap-2">
                {/* Text Input */}
                <div className="flex-1">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('input.placeholder')}
                    className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim()) {
                          handleSubmitMeal();
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 pb-2">
                  {/* Camera Upload */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => document.getElementById('camera-upload')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      id="camera-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      multiple
                    />
                  </div>
                  
                  {/* Gallery Upload */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => document.getElementById('gallery-upload')?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <input
                      id="gallery-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      multiple
                    />
                  </div>
                  
                  {/* Voice Recording */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 transition-all duration-200 ${
                      isRecording || isProcessing
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                        : 'hover:bg-primary/10'
                    }`}
                    onClick={handleVoiceRecord}
                    disabled={isAnalyzing || isProcessing}
                  >
                    {isRecording ? (
                      <StopCircle className="h-4 w-4" />
                    ) : isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Send Button */}
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSubmitMeal}
                    disabled={!inputText.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Recording Indicator */}
              {(isRecording || isProcessing) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-red-500 animate-pulse rounded"></div>
                    <div className="w-1 h-4 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{isRecording ? t('input.recording') : 'Verarbeitung...'}</span>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="pb-24">


          {/* BMI Progress */}
          {profileData && (
            <BMIProgress 
              startWeight={profileData.start_weight || profileData.weight}
              currentWeight={weightHistory.length > 0 ? weightHistory[0].weight : profileData.weight}
              targetWeight={profileData.target_weight}
              height={profileData.height}
            />
          )}



          {/* Weight Input Modal */}
          <Dialog open={showWeightInput} onOpenChange={setShowWeightInput}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gewicht heute eintragen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="weightInput">Gewicht (kg)</Label>
                  <Input
                    id="weightInput"
                    type="number"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder="70.5"
                    step="0.1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveWeightEntry} disabled={!weightInput} className="flex-1">
                    Speichern
                  </Button>
                  <Button variant="outline" onClick={() => setShowWeightInput(false)} className="flex-1">
                    Abbrechen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Empty State */}
          {dailyMeals.length === 0 && (
            <Card className="p-8 text-center border-dashed border-2 border-muted">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Noch keine Mahlzeiten heute</h3>
              <p className="text-muted-foreground text-sm">
                Füge deine erste Mahlzeit hinzu
              </p>
            </Card>
          )}
        </div>
      
      {/* Confirmation Dialog for Image Analysis */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `Mahlzeit für ${new Date(selectedDate).toLocaleDateString('de-DE')} hinzufügen` : 'Mahlzeit bestätigen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Display analyzed data */}
            {analyzedMealData && (
              <div className="space-y-3">
                {/* Meal Title */}
                {analyzedMealData.title && (
                  <div className="space-y-2">
                    <Label htmlFor="mealTitle">Mahlzeit-Titel:</Label>
                    <Input
                      id="mealTitle"
                      value={analyzedMealData.title}
                      onChange={(e) => setAnalyzedMealData({
                        ...analyzedMealData,
                        title: e.target.value
                      })}
                      className="font-medium"
                    />
                  </div>
                )}
                
                {/* Only show nutritional data if we have valid data */}
                {analyzedMealData.total.calories > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                    <div className="font-medium">Kalorien:</div>
                    <div>{Math.round(analyzedMealData.total.calories)} kcal</div>
                    <div className="font-medium">Protein:</div>
                    <div>{Math.round(analyzedMealData.total.protein)}g</div>
                    <div className="font-medium">Kohlenhydrate:</div>
                    <div>{Math.round(analyzedMealData.total.carbs)}g</div>
                    <div className="font-medium">Fett:</div>
                    <div>{Math.round(analyzedMealData.total.fats)}g</div>
                  </div>
                )}
                
                {/* Display uploaded images */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Hochgeladene Bilder:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedImages.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Mahlzeit ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Chat with AI Assistant */}
                <div className="space-y-3">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat mit KI-Assistent
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="max-h-32 overflow-y-auto space-y-2 bg-muted/30 p-2 rounded-lg">
                    {chatMessages.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        Frage mich nach Details zu deiner Mahlzeit!<br />
                        z.B. "Das waren nur 100g Reis" oder "Mit extra Olivenöl"
                      </div>
                    ) : (
                      chatMessages.map((msg, index) => (
                        <div key={index} className={`text-sm p-2 rounded ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-4' 
                            : 'bg-background mr-4'
                        }`}>
                          {msg.content}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Frage nach Details zur Mahlzeit..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleChatSubmit();
                        }
                      }}
                    />
                    <Button
                      onClick={handleChatSubmit}
                      disabled={!chatInput.trim() || isVerifying}
                      size="sm"
                    >
                      {isVerifying ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Meal type selection */}
                <div className="space-y-2">
                  <Label htmlFor="mealType">Mahlzeit-Typ:</Label>
                  <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wähle einen Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Frühstück</SelectItem>
                      <SelectItem value="lunch">Mittagessen</SelectItem>
                      <SelectItem value="dinner">Abendessen</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmMeal}
                disabled={!inputText.trim() || (analyzedMealData?.total.calories === 0 && !selectedDate)}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : null}
                {selectedDate ? 'Hinzufügen' : 'Bestätigen'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmationDialog(false);
                  setAnalyzedMealData(null);
                  setUploadedImages([]);
                  setSelectedMealType('');
                  setChatMessages([]);
                  setChatInput('');
                  setSelectedDate('');
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
