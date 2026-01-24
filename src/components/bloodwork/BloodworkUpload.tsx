// Bloodwork Upload Component with OCR extraction
// Handles PDF/image upload and AI-powered value extraction

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Camera, Loader2, Sparkles, Upload, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ExtractedBloodwork {
  success: boolean;
  lab_name?: string;
  test_date?: string;
  is_fasted?: boolean;
  markers: Record<string, number>;
  unrecognized?: Array<{ name: string; value: number; unit?: string }>;
  confidence: number;
  notes?: string;
  error?: string;
}

interface BloodworkUploadProps {
  onExtracted: (data: ExtractedBloodwork) => void;
  onError: (error: string) => void;
}

export function BloodworkUpload({ onExtracted, onError }: BloodworkUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { user } = useAuth();

  const processFile = useCallback(async (file: File) => {
    if (!user) {
      onError("Bitte zuerst einloggen");
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onError("Nur PDF, JPG, PNG oder WebP erlaubt");
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      onError("Datei zu groß (max. 10MB)");
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null); // No preview for PDFs
    }

    const filePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
      console.log('[BloodworkUpload] Uploading file:', file.name);
      
      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('bloodwork-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[BloodworkUpload] Upload error:', uploadError);
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      // 2. Get signed URL for edge function
      const { data: urlData, error: urlError } = await supabase.storage
        .from('bloodwork-uploads')
        .createSignedUrl(filePath, 3600); // 1 hour validity

      if (urlError || !urlData?.signedUrl) {
        throw new Error("Konnte keine signierte URL erstellen");
      }

      console.log('[BloodworkUpload] Calling OCR edge function');

      // 3. Call edge function for OCR extraction
      const { data, error } = await supabase.functions.invoke('bloodwork-ocr-extract', {
        body: { imageUrl: urlData.signedUrl }
      });

      // 4. Cleanup: Delete file after extraction (regardless of success)
      await supabase.storage
        .from('bloodwork-uploads')
        .remove([filePath])
        .catch(err => console.warn('[BloodworkUpload] Cleanup failed:', err));

      if (error) {
        console.error('[BloodworkUpload] Edge function error:', error);
        throw new Error(error.message || "OCR-Analyse fehlgeschlagen");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Keine Werte erkannt");
      }

      const markerCount = Object.keys(data.markers || {}).filter(
        k => data.markers[k] !== null && data.markers[k] !== undefined
      ).length;

      console.log('[BloodworkUpload] Extraction successful:', {
        markers: markerCount,
        confidence: data.confidence
      });

      toast.success(`${markerCount} Werte erkannt!`, {
        description: `Konfidenz: ${Math.round(data.confidence * 100)}%`
      });

      onExtracted(data);

    } catch (err: any) {
      console.error('[BloodworkUpload] Error:', err);
      const errorMessage = err.message || "OCR-Analyse fehlgeschlagen";
      toast.error(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [user, onExtracted, onError]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  });

  const hasRejectedFiles = fileRejections.length > 0;

  const cancelProcessing = useCallback(() => {
    setIsProcessing(false);
    setPreview(null);
    setFileName(null);
  }, []);

  return (
    <Card className={cn(
      "border-2 border-dashed transition-all duration-200",
      isProcessing 
        ? "border-primary/50 bg-primary/5" 
        : isDragActive 
          ? "border-primary bg-primary/10" 
          : hasRejectedFiles
            ? "border-destructive bg-destructive/5"
            : "border-primary/30 bg-primary/5 hover:border-primary/50"
    )}>
      <CardContent className="p-6">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Analysiere Laborbericht...</p>
              <p className="text-sm text-muted-foreground">
                KI extrahiert deine Blutwerte
              </p>
              {fileName && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {fileName}
                </p>
              )}
            </div>
            {preview && (
              <img 
                src={preview} 
                alt="Vorschau" 
                className="max-h-24 rounded-lg opacity-50 border border-border" 
              />
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={cancelProcessing}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className="cursor-pointer"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex gap-3">
                <div className={cn(
                  "p-3 rounded-full",
                  hasRejectedFiles ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {hasRejectedFiles ? (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  ) : (
                    <FileText className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className={cn(
                  "p-3 rounded-full",
                  hasRejectedFiles ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {hasRejectedFiles ? (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  ) : (
                    <Camera className="h-6 w-6 text-primary" />
                  )}
                </div>
              </div>
              
              {hasRejectedFiles ? (
                <div className="text-center text-destructive">
                  <p className="font-medium">Ungültiges Format</p>
                  <p className="text-sm">Erlaubt: PDF, JPG, PNG, WebP (max. 10MB)</p>
                </div>
              ) : isDragActive ? (
                <div className="text-center">
                  <p className="font-medium text-primary">Datei hier ablegen...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium">Laborbericht hochladen</p>
                  <p className="text-sm text-muted-foreground">
                    PDF oder Foto deines Befunds
                  </p>
                </div>
              )}
              
              <Badge variant="outline" className="mt-1 bg-background">
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                KI-gestützte Erkennung
              </Badge>
              
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG oder WebP • Max. 10MB
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
