import React, { useState, useRef, useCallback } from 'react';
import { Camera, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useMealVisionAnalysis } from '@/hooks/useMealVisionAnalysis';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ConfirmMealModal from '@/components/ConfirmMealModal';

interface MealInputProps {
  onMealSaved?: () => void;
}

export const MealInput: React.FC<MealInputProps> = ({ onMealSaved }) => {
  const [text, setText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyzeImages, isAnalyzing } = useMealVisionAnalysis();
  const { user } = useAuth();

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0 || !user?.id) return;
    
    setIsUploading(true);
    try {
      const result = await uploadFilesWithProgress(files, user.id, () => {});
      if (result.success && result.urls.length > 0) {
        setUploadedImages(prev => [...prev, ...result.urls]);
        toast.success(`${result.urls.length} Bild(er) hochgeladen`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  }, [user?.id]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    if (e.currentTarget) {
      e.currentTarget.value = '';
    }
  }, [handleFileUpload]);

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (uploadedImages.length === 0 && !text.trim()) {
      toast.error('Bitte Text eingeben oder Bild hochladen');
      return;
    }

    try {
      let result;
      
      if (uploadedImages.length > 0) {
        // Use GPT-4o vision analysis
        result = await analyzeImages(uploadedImages, text);
      } else {
        // Text-only fallback
        result = {
          title: text.trim(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          confidence: 0,
          meal_type: 'other',
          analysis_notes: 'Nur Textbeschreibung - bitte Nährwerte manuell eingeben'
        };
      }

      setAnalyzedData(result);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analyse fehlgeschlagen');
    }
  }, [uploadedImages, text, analyzeImages]);

  const handleConfirm = useCallback(() => {
    setShowConfirmModal(false);
    setAnalyzedData(null);
    setText('');
    setUploadedImages([]);
    onMealSaved?.();
    toast.success('Mahlzeit gespeichert');
  }, [onMealSaved]);

  const handleClose = useCallback(() => {
    setShowConfirmModal(false);
    setAnalyzedData(null);
  }, []);

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4 space-y-4">
          {/* Image thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((url, index) => (
                <div key={url + index} className="relative">
                  <img
                    src={url}
                    alt={`Mahlzeit ${index + 1}`}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/placeholder.svg'; console.warn('Thumbnail failed to load, replaced with placeholder:', url); }}
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 rounded-full bg-background border border-border shadow p-1 hover:bg-muted transition"
                    aria-label="Bild entfernen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input */}
          <Textarea
            placeholder="Beschreibe deine Mahlzeit (optional mit Bildern)..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {isUploading ? 'Lade hoch...' : 'Foto'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {uploadedImages.length}/5 Bilder
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isAnalyzing || (uploadedImages.length === 0 && !text.trim())}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isAnalyzing ? 'Analysiere...' : 'Analysieren'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && analyzedData && (
        <ConfirmMealModal
          open={showConfirmModal}
          prompt="Mahlzeit speichern?"
          proposal={analyzedData}
          onConfirm={handleConfirm}
          onClose={handleClose}
          uploadedImages={uploadedImages}
        />
      )}
    </>
  );
};

export default MealInput;