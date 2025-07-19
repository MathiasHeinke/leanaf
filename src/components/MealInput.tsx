
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Send, StopCircle, ImagePlus, X, Paperclip } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

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
  onCancelEdit
}: MealInputProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-3xl mx-auto pl-3 pb-3">
        {/* Image Thumbnails - Above input */}
        {uploadedImages && uploadedImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group animate-scale-in">
                <img
                  src={imageUrl}
                  alt={`Uploaded ${index + 1}`}
                  className="w-12 h-12 object-cover rounded-lg border border-border/30 shadow-sm hover:scale-105 transition-transform duration-200 backdrop-blur-sm"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Recording Indicator - Above input */}
        {(isRecording || isProcessing) && (
          <div className="mb-3 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-red-200/50 dark:border-red-800/30 animate-fade-in">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full"></div>
              <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="font-medium">{isRecording ? t('input.recording') : 'Verarbeitung...'}</span>
          </div>
        )}
        
        {/* Main Input Container - Glass Design */}
        <div className="relative bg-background/40 dark:bg-background/40 backdrop-blur-sm border border-border/30 rounded-2xl shadow-xl hover:bg-background/70 hover:dark:bg-background/70 focus-within:border-primary/50 focus-within:shadow-2xl transition-all duration-300">
          {/* Text Input - Proper spacing from icon */}
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('input.placeholder')}
              className="min-h-[56px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/50 pl-12 pr-20 py-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim()) {
                    onSubmitMeal();
                  }
                }
              }}
            />
            
            {/* Left Action Button - Paperclip with proper positioning */}
            <div className="absolute left-3 bottom-3 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted/60 transition-colors"
                onClick={() => document.getElementById('gallery-upload')?.click()}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground/60" />
              </Button>
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoUpload}
                multiple
              />
              <input
                id="camera-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhotoUpload}
                multiple
              />
            </div>
            
            {/* Right Action Buttons - Voice + Send */}
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              {/* Voice Recording */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                  isRecording || isProcessing
                    ? 'bg-red-100/80 hover:bg-red-200/80 text-red-600 dark:bg-red-950/50 dark:hover:bg-red-950/70 dark:text-red-400 backdrop-blur-sm' 
                    : 'hover:bg-muted/60'
                }`}
                onClick={onVoiceRecord}
                disabled={isAnalyzing || isProcessing}
              >
                {isRecording ? (
                  <StopCircle className="h-4 w-4" />
                ) : isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Mic className="h-4 w-4 text-muted-foreground/60" />
                )}
              </Button>
              
              {/* Send Button */}
              <Button
                size="sm"
                className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 ${
                  (!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing
                    ? 'opacity-50 cursor-not-allowed bg-muted/60 backdrop-blur-sm'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                }`}
                onClick={onSubmitMeal}
                disabled={(!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing}
              >
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
