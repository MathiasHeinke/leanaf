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
  
  // Debug logging
  console.log('MealInput render state:', {
    inputText: inputText.length,
    uploadedImages: uploadedImages?.length || 0,
    isAnalyzing,
    buttonDisabled: (!inputText.trim() && (!uploadedImages || uploadedImages.length === 0)) || isAnalyzing
  });

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-sm mx-auto">
        {/* Image Thumbnails */}
        {uploadedImages && uploadedImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Uploaded ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-primary/20"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <Card className="p-3 shadow-xl border-2 border-primary/20 bg-background/95 backdrop-blur">
          <div className="flex items-end gap-2">
            {/* Text Input */}
            <div className="flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('input.placeholder')}
                className="min-h-[40px] max-h-[100px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
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
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 pb-1">
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
                  onChange={onPhotoUpload}
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
                  onChange={onPhotoUpload}
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
                onClick={onVoiceRecord}
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
  );
};