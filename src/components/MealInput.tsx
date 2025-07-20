
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Send, StopCircle, ImagePlus, X, Paperclip } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { UploadProgress } from "@/components/UploadProgress";
import { UploadProgress as UploadProgressType } from "@/utils/uploadHelpers";

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
  isUploading = false
}: MealInputProps) => {
  const { t } = useTranslation();
  
  // Local state for button interaction feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Button disabled states - Clear separation of concerns
  const isSubmitDisabled = (!inputText.trim() && uploadedImages.length === 0) || isAnalyzing || isUploading;
  const isUploadDisabled = isUploading || isAnalyzing;
  const isVoiceDisabled = isProcessing; // Only disabled when voice is actually processing

  // Handle submit with local state management
  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    
    console.log('🔄 Submit button clicked');
    setIsSubmitting(true);
    
    try {
      await onSubmitMeal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle photo upload with event isolation
  const handlePhotoUploadClick = (event: React.MouseEvent) => {
    console.log('📷 Photo upload button clicked');
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
    console.log('🎙️ Voice button clicked');
    event.preventDefault();
    event.stopPropagation();
    
    if (isVoiceDisabled) return;
    
    onVoiceRecord();
  };

  // Handle key press for submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitDisabled) {
        handleSubmit();
      }
    }
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
        <div className="relative bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl hover:bg-card/80 focus-within:border-primary/70 focus-within:shadow-2xl focus-within:bg-card/80 transition-all duration-300 group">
          {/* Text Input */}
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('input.placeholder')}
              className="min-h-[60px] max-h-[140px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/70 pl-4 pr-20 pb-6 pt-4 leading-relaxed"
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing || isUploading}
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
