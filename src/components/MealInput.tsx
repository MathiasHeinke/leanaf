
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
    <div className="relative w-full">
      <div className="w-full">
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
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Recording Indicator - Above input */}
        {(isRecording || isProcessing) && (
          <div className="mb-4 flex items-center gap-3 text-sm bg-card/95 backdrop-blur-md px-4 py-3 rounded-xl border border-border/50 shadow-lg animate-fade-in">
            <div className="flex gap-1">
              <div className="w-1.5 h-3 bg-destructive animate-pulse rounded-full"></div>
              <div className="w-1.5 h-4 bg-destructive animate-pulse rounded-full" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-3 bg-destructive animate-pulse rounded-full" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="font-medium text-foreground">{isRecording ? t('input.recording') : 'Verarbeitung...'}</span>
          </div>
        )}
        
        {/* Main Input Container - Enhanced Glass Design */}
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl hover:bg-card/80 focus-within:border-primary/60 focus-within:shadow-xl focus-within:bg-card/90 transition-all duration-300 group">
          {/* Text Input */}
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('input.placeholder')}
              className="min-h-[60px] max-h-[140px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/60 pl-4 pr-20 pb-6 pt-4 leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim()) {
                    onSubmitMeal();
                  }
                }
              }}
            />
            
            {/* Left Action Button - Enhanced Paperclip */}
            <div className="absolute left-4 bottom-2 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 p-0 rounded-xl hover:bg-muted/70 transition-all duration-200 hover:scale-105 ${inputText ? 'opacity-30' : 'opacity-100'}`}
                onClick={() => document.getElementById('gallery-upload')?.click()}
              >
                <Paperclip className="h-5 w-5 text-muted-foreground/70 group-focus-within:text-muted-foreground transition-colors" />
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
            
            {/* Right Action Buttons - Enhanced Voice + Send */}
            <div className="absolute right-4 bottom-2 flex items-center gap-2">
              {/* Voice Recording */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
                  isRecording || isProcessing
                    ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20' 
                    : 'hover:bg-muted/70 hover:scale-105'
                }`}
                onClick={onVoiceRecord}
                disabled={isAnalyzing || isProcessing}
              >
                {isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground/70 group-focus-within:text-muted-foreground transition-colors" />
                )}
              </Button>
              
              {/* Send Button */}
              <Button
                size="sm"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 ${
                  (!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing
                    ? 'opacity-75 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                }`}
                onClick={onSubmitMeal}
                disabled={(!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing}
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
