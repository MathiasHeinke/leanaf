
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Send, StopCircle, ImagePlus, X, Paperclip, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { UploadProgress } from "@/components/UploadProgress";
import { UploadProgress as UploadProgressType } from "@/utils/uploadHelpers";
import { sanitizeInput } from "@/utils/securityHelpers";
import { secureLogger } from "@/utils/secureLogger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MealInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSubmitMeal: () => void;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceRecord: () => void;
  isAnalyzing: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  uploadedImages: string[];
  onRemoveImage: (index: number) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  uploadProgress?: UploadProgressType[];
  isUploading?: boolean;
  showAISuggestions?: boolean;
}

export const MealInput = ({
  inputText,
  setInputText,
  onSubmitMeal,
  onPhotoUpload,
  onVoiceRecord,
  isAnalyzing,
  isRecording,
  isProcessing,
  uploadedImages,
  onRemoveImage,
  isEditing = false,
  onCancelEdit,
  uploadProgress = [],
  isUploading = false,
  showAISuggestions = true
}: MealInputProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Local state for button interaction feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Button disabled states - Clear separation of concerns
  const isSubmitDisabled = (!inputText.trim() && uploadedImages.length === 0) || isAnalyzing || isUploading;
  const isUploadDisabled = isUploading || isAnalyzing;
  const isVoiceDisabled = isProcessing; // Only disabled when voice is actually processing

  // Handle submit with local state management
  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    
    secureLogger.debug('Submit button clicked');
    setIsSubmitting(true);
    
    try {
      await onSubmitMeal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle photo upload with event isolation
  const handlePhotoUploadClick = (event: React.MouseEvent) => {
    secureLogger.debug('Photo upload button clicked');
    event.preventDefault();
    event.stopPropagation();
    
    if (isUploadDisabled) return;
    
    const fileInput = document.getElementById('gallery-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  // Handle voice recording with event isolation
  const handleVoiceClick = (event: React.MouseEvent) => {
    secureLogger.debug('Voice button clicked');
    event.preventDefault();
    event.stopPropagation();
    
    if (isVoiceDisabled) return;
    
    onVoiceRecord();
  };

  // AI Suggestions functionality
  const getTimeBasedSuggestions = () => {
    const hour = new Date().getHours();
    if (hour < 10) return ['Haferflocken mit Beeren', 'Rührei mit Toast', 'Joghurt mit Müsli'];
    if (hour < 14) return ['Salat mit Hähnchen', 'Pasta mit Gemüse', 'Suppe mit Brot'];
    if (hour < 18) return ['Apfel mit Nüssen', 'Protein-Shake', 'Joghurt'];
    return ['Lachs mit Gemüse', 'Gemüse-Pfanne', 'Suppe'];
  };

  const currentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 14) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  const normalize = (s: string) => s
    .toLowerCase()
    .replace(/:[\p{L}\p{N}_-]+:/gu, '') // strip emoji shortcodes
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // strip emojis
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep letters/numbers/spaces
    .replace(/\s+/g, ' ')
    .trim();

  const timeOfDayFrom = (mealType: string | null | undefined, ts?: string | null) => {
    if (mealType) {
      const t = mealType.toLowerCase();
      if (t.includes('früh') || t.includes('breakfast')) return 'breakfast';
      if (t.includes('mittag') || t.includes('lunch')) return 'lunch';
      if (t.includes('abend') || t.includes('dinner')) return 'dinner';
      if (t.includes('snack')) return 'snack';
    }
    const d = ts ? new Date(ts) : new Date();
    const h = d.getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  };

  // Load AI suggestions from recent meals
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user || !showAISuggestions) return;
      try {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        const { data, error } = await supabase
          .from('meals')
          .select('text, created_at, meal_type')
          .eq('user_id', user.id)
          .gte('created_at', from.toISOString())
          .order('created_at', { ascending: false })
          .limit(400);
        if (error) throw error;

        const map = new Map<string, { display: string; count: number; todHits: Record<string, number>; lastAt: number }>();
        (data || []).forEach((m: any) => {
          const title = (m.text || '').toString().trim();
          if (!title) return;
          const key = normalize(title);
          const tod = timeOfDayFrom(m.meal_type, m.created_at);
          const rec = map.get(key) || { display: title, count: 0, todHits: { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }, lastAt: 0 };
          rec.display = title.length <= rec.display.length ? title : rec.display;
          rec.count += 1;
          rec.todHits[tod] = (rec.todHits[tod] || 0) + 1;
          rec.lastAt = Math.max(rec.lastAt, new Date(m.created_at).getTime());
          map.set(key, rec);
        });

        const nowTod = currentTimeOfDay();
        const ranked = Array.from(map.values())
          .map(r => {
            const todWeight = r.todHits[nowTod] || 0;
            const score = r.count * 1.0 + todWeight * 0.75 + (r.lastAt / 1000_000_000_000);
            return { title: r.display, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(r => r.title);

        setSuggestions(ranked.length > 0 ? ranked : getTimeBasedSuggestions());
      } catch (e) {
        console.error('Failed to load meal suggestions', e);
        setSuggestions(getTimeBasedSuggestions());
      }
    };
    loadSuggestions();
  }, [user, showAISuggestions]);

  // Show suggestions when input is empty and focused
  useEffect(() => {
    setShowSuggestions(inputText.length === 0 && showAISuggestions);
  }, [inputText, showAISuggestions]);

  // Handle key press for submit - fix space bug properly
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (!isSubmitDisabled && inputText.trim().length > 0) {
        handleSubmit();
      }
    }
    // Don't prevent space at beginning - let user type normally
  };
  
  return (
    <div className="w-full">
      <div className="w-full">
        {/* Upload Progress - Above everything */}
        <UploadProgress 
          progress={uploadProgress} 
          isVisible={isUploading && uploadProgress.length > 0} 
        />

        {/* Image Thumbnails - Above input */}
        {uploadedImages && uploadedImages.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 animate-fade-in">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group animate-scale-in">
                <img
                  src={imageUrl}
                  alt={`Uploaded ${index + 1}`}
                  className="w-14 h-14 object-cover rounded-xl border-2 border-border/20 shadow-md hover:scale-105 transition-all duration-300 backdrop-blur-sm hover:shadow-lg"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110 z-10"
                  disabled={isAnalyzing || isUploading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Recording/Processing Indicator - Above input - Clear state messaging */}
        {(isRecording || isProcessing || isAnalyzing) && (
          <div className="mb-4 flex items-center gap-3 text-sm bg-card/95 backdrop-blur-md px-4 py-3 rounded-xl border border-border/50 shadow-lg animate-fade-in">
            <div className="flex gap-1">
              <div className="w-1.5 h-3 bg-destructive animate-pulse rounded-full"></div>
              <div className="w-1.5 h-4 bg-destructive animate-pulse rounded-full" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-3 bg-destructive animate-pulse rounded-full" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="font-medium text-foreground">
              {isRecording ? t('input.recording') : 
               isProcessing ? t('input.processing') : 
               isAnalyzing ? 'Analysiere Mahlzeit...' : 
               'Verarbeitung...'}
            </span>
          </div>
        )}
        
        {/* Main Input Container */}
        <div className="relative bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl hover:bg-card/80 focus-within:border-primary/70 focus-within:shadow-2xl focus-within:bg-card/80 transition-all duration-300 group meal-input focus-within:[&::after]:hidden"
             style={{ animationPlayState: inputText.trim() ? 'paused' : 'running' }}>
          {/* AI Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-4 left-4 right-20 z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">KI-Vorschläge</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 hover:border-primary/30"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Text Input */}
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => {
                // Fix space bug: bypass sanitizeInput to allow leading spaces
                setInputText(e.target.value.slice(0, 2000));
              }}
              placeholder={t('input.placeholder')}
              className={`min-h-[60px] max-h-[140px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/70 pl-4 pr-20 pb-6 leading-relaxed transition-all duration-300 ${
                showSuggestions ? 'pt-20' : 'pt-4'
              }`}
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing || isUploading}
              onFocus={() => setShowSuggestions(inputText.length === 0 && showAISuggestions)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            
            {/* Left Action Button - Photo Upload */}
            <div className="absolute left-4 bottom-2 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className={`h-9 w-9 p-0 rounded-xl hover:bg-muted/90 transition-all duration-200 hover:scale-105 ${
                  isUploadDisabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
                }`}
                onClick={handlePhotoUploadClick}
                disabled={isUploadDisabled}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Paperclip className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                )}
              </Button>
              
              {/* Hidden file inputs */}
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoUpload}
                multiple
                disabled={isUploadDisabled}
              />
            </div>
            
            {/* Right Action Buttons - Voice + Send */}
            <div className="absolute right-4 bottom-2 flex items-center gap-2">
              {/* Voice Recording Button - Only shows loading when voice is processing */}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
                  isRecording
                    ? 'bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30' 
                    : 'hover:bg-muted/90 hover:scale-105'
                } ${isVoiceDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleVoiceClick}
                disabled={isVoiceDisabled}
              >
                {isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                )}
              </Button>
              
              {/* Send Button - Only shows loading when analyzing */}
              <Button
                size="sm"
                type="button"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 font-medium ${
                  isSubmitDisabled
                    ? 'opacity-50 cursor-not-allowed bg-muted/80 text-muted-foreground hover:bg-muted/80'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                }`}
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
              >
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
