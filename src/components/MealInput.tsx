import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Send, StopCircle, ImagePlus, X } from "lucide-react";
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
  onRemoveImage
}: MealInputProps) => {
  const { t } = useTranslation();
  

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="max-w-sm mx-auto">
        {/* Image Thumbnails - Modern Grid */}
        {uploadedImages && uploadedImages.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group animate-scale-in">
                <img
                  src={imageUrl}
                  alt={`Uploaded ${index + 1}`}
                  className="w-18 h-18 object-cover rounded-2xl border-2 border-white/20 shadow-lg hover:scale-105 transition-transform duration-200"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Modern Glass Card with Better Styling */}
        <div className="glass-card dark:glass-card-dark rounded-3xl p-4 shadow-2xl border border-white/20 dark:border-gray-700/20 modern-shadow backdrop-blur-xl">
          <div className="flex items-end gap-3">
            {/* Text Input - Enhanced */}
            <div className="flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('input.placeholder')}
                className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-muted-foreground/60 rounded-2xl px-4 py-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) {
                      onSubmitMeal();
                    }
                  }
                }}
              />
            </div>
            
            {/* Action Buttons - Modern Design */}
            <div className="flex items-center gap-2">
              {/* Camera Upload */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 p-0 rounded-2xl hover:bg-primary/10 transition-all duration-200 hover:scale-105 border border-transparent hover:border-primary/20"
                  onClick={() => document.getElementById('camera-upload')?.click()}
                >
                  <Camera className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
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
              
              {/* Gallery Upload */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 p-0 rounded-2xl hover:bg-primary/10 transition-all duration-200 hover:scale-105 border border-transparent hover:border-primary/20"
                  onClick={() => document.getElementById('gallery-upload')?.click()}
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
                <input
                  id="gallery-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoUpload}
                  multiple
                />
              </div>
              
              {/* Voice Recording - Enhanced States */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-11 w-11 p-0 rounded-2xl transition-all duration-200 hover:scale-105 border ${
                  isRecording || isProcessing
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-300 animate-glow shadow-lg' 
                    : 'border-transparent hover:border-primary/20 hover:bg-primary/10'
                }`}
                onClick={onVoiceRecord}
                disabled={isAnalyzing || isProcessing}
              >
                {isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </Button>
              
              {/* Send Button - Modern Gradient */}
              <Button
                size="sm"
                className={`h-11 w-11 p-0 rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg ${
                  (!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-primary-glow hover:shadow-xl'
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
          
          {/* Recording Indicator - Enhanced Design */}
          {(isRecording || isProcessing) && (
            <div className="mt-4 flex items-center gap-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-2xl border border-red-200 dark:border-red-800/50 animate-fade-in">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full"></div>
                <div className="w-1 h-5 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="font-medium">{isRecording ? t('input.recording') : 'Verarbeitung...'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};