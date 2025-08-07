import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { ProgressPhotoCropModal } from '@/components/TransformationJourney/ProgressPhotoCropModal';

interface WeightEntry {
  id: string;
  user_id: string;
  weight: number;
  date: string;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  photo_urls?: any; // Changed to any to handle Json type from Supabase
  photo_metadata?: any; // Added photo_metadata field
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useProgressPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedFiles, setCroppedFiles] = useState<File[]>([]);
  const [pendingUploadData, setPendingUploadData] = useState<{
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    notes?: string;
  } | null>(null);

  const loadProgressPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .not('photo_urls', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Process and transform entries with photos
      const entriesWithPhotos = (data || []).filter(entry => {
        let photoUrls = entry.photo_urls;
        
        // Handle different photo_urls formats
        if (typeof photoUrls === 'string') {
          try {
            photoUrls = JSON.parse(photoUrls);
          } catch (e) {
            return false;
          }
        }
        
        // Support both array and object formats
        if (Array.isArray(photoUrls)) {
          return photoUrls.length > 0 && photoUrls.some(url => url && typeof url === 'string' && url.trim() !== '');
        }
        
        if (photoUrls && typeof photoUrls === 'object') {
          const urls = Object.values(photoUrls);
          return urls.length > 0 && urls.some(url => url && typeof url === 'string' && url.trim() !== '');
        }
        
        return false;
      }).map(entry => {
        // Transform array format to object format for compatibility
        let photoUrls = entry.photo_urls;
        if (typeof photoUrls === 'string') {
          try {
            photoUrls = JSON.parse(photoUrls);
          } catch (e) {
            photoUrls = [];
          }
        }
        
        // Convert array to object format with AI-enhanced categorization
        if (Array.isArray(photoUrls)) {
          const transformedUrls: any = {};
          photoUrls.forEach((url, index) => {
            if (url && typeof url === 'string' && url.trim() !== '') {
              // Check if we have photo metadata for smarter categorization
              const photoMetadata = entry.photo_metadata;
              let category = '';
              
              if (photoMetadata && typeof photoMetadata === 'object') {
                // Look for analysis that matches this photo URL
                const metadataKey = `photo_${index + 1}`;
                const analysis = photoMetadata[metadataKey];
                
                if (analysis && analysis.view && analysis.view !== 'unknown') {
                  category = analysis.view;
                } else {
                  // Fallback to position-based categorization
                  if (index === 0) category = 'front';
                  else if (index === 1) category = 'side';
                  else if (index === 2) category = 'back';
                  else category = `front_${index}`;
                }
              } else {
                // Default position-based categorization
                if (index === 0) category = 'front';
                else if (index === 1) category = 'side';
                else if (index === 2) category = 'back';
                else category = `front_${index}`;
              }
              
              transformedUrls[category] = url;
            }
          });
          
          console.log(`Entry ${entry.date}: Array with ${photoUrls.length} URLs transformed to:`, transformedUrls);
          
          return {
            ...entry,
            photo_urls: transformedUrls
          };
        }
        
        console.log(`Entry ${entry.date}: Already object format:`, photoUrls);
        return entry;
      });
      
      console.log('Filtered entries with photos:', entriesWithPhotos.length);
      setPhotos(entriesWithPhotos as WeightEntry[]);
    } catch (error) {
      console.error('Error loading progress photos:', error);
      toast.error('Fehler beim Laden der Fortschrittsfotos');
    } finally {
      setLoading(false);
    }
  };

  const startCropWorkflow = async (files: File[], weight?: number, bodyFat?: number, muscleMass?: number, notes?: string) => {
    if (!user || files.length === 0) return;
    
    setPendingFiles(files);
    setCroppedFiles([]);
    setPendingUploadData({ weight, bodyFat, muscleMass, notes });
    
    if (files.length > 0) {
      setCurrentCropFile(files[0]);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    const newCroppedFiles = [...croppedFiles, croppedFile];
    setCroppedFiles(newCroppedFiles);
    
    const nextIndex = newCroppedFiles.length;
    if (nextIndex < pendingFiles.length) {
      setCurrentCropFile(pendingFiles[nextIndex]);
    } else {
      setShowCropModal(false);
      setCurrentCropFile(null);
      // All files cropped, proceed with upload
      if (pendingUploadData) {
        uploadProgressPhoto(
          newCroppedFiles, 
          pendingUploadData.weight, 
          pendingUploadData.bodyFat, 
          pendingUploadData.muscleMass, 
          pendingUploadData.notes
        );
      }
      // Reset state
      setPendingFiles([]);
      setCroppedFiles([]);
      setPendingUploadData(null);
    }
  };

  const uploadProgressPhoto = async (files: File[], weight?: number, bodyFat?: number, muscleMass?: number, notes?: string) => {
    if (!user || files.length === 0) return;

    try {
      // Upload files using the same system as QuickWeightInput
      const uploadResult = await uploadFilesWithProgress(files, user.id);
      
      if (!uploadResult.success) {
        toast.error('Fehler beim Hochladen der Bilder');
        return;
      }

      const today = getCurrentDateString();
      
      // Check if weight entry exists for today
      const { data: existingEntry, error: checkError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (checkError) throw checkError;

      let updatedEntry;
      let weightHistoryId: string;
      
      if (existingEntry) {
        // Update existing entry with new photos
        let existingPhotos: string[] = [];
        if (existingEntry.photo_urls) {
          if (typeof existingEntry.photo_urls === 'string') {
            try {
              existingPhotos = JSON.parse(existingEntry.photo_urls);
            } catch (e) {
              existingPhotos = [];
            }
          } else if (Array.isArray(existingEntry.photo_urls)) {
            existingPhotos = existingEntry.photo_urls.filter((url): url is string => typeof url === 'string');
          }
        }
        const allPhotos = [...existingPhotos, ...uploadResult.urls];
        
        const { data, error: updateError } = await supabase
          .from('weight_history')
          .update({
            photo_urls: allPhotos,
            weight: weight || existingEntry.weight,
            body_fat_percentage: bodyFat || existingEntry.body_fat_percentage,
            muscle_percentage: muscleMass || existingEntry.muscle_percentage,
            notes: notes || existingEntry.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        updatedEntry = data;
        weightHistoryId = existingEntry.id;
      } else {
        // Create new entry
        const { data, error: insertError } = await supabase
          .from('weight_history')
          .insert({
            user_id: user.id,
            date: today,
            weight: weight || 0, // Default weight if not provided
            body_fat_percentage: bodyFat,
            muscle_percentage: muscleMass,
            photo_urls: uploadResult.urls,
            notes
          })
          .select()
          .maybeSingle();

        if (insertError) throw insertError;
        updatedEntry = data;
        weightHistoryId = data.id;
      }

      // Analyze each uploaded photo with OpenAI Vision
      const photoAnalyses: Record<string, any> = {};
      
      for (let i = 0; i < uploadResult.urls.length; i++) {
        const imageUrl = uploadResult.urls[i];
        const photoKey = `photo_${i + 1}`;
        
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-body-pose', {
            body: {
              imageUrl,
              weightHistoryId
            }
          });

          if (analysisError) {
            console.error('Analysis error for photo', i + 1, ':', analysisError);
            photoAnalyses[photoKey] = {
              view: 'unknown',
              confidence: 0,
              muscle_definition: 5,
              lighting_quality: 5,
              pose_quality: 5,
              notes: 'Analysis failed',
              error: analysisError.message
            };
          } else {
            photoAnalyses[photoKey] = analysisData.analysis;
          }
        } catch (error) {
          console.error('Error analyzing photo', i + 1, ':', error);
          photoAnalyses[photoKey] = {
            view: 'unknown',
            confidence: 0,
            muscle_definition: 5,
            lighting_quality: 5,
            pose_quality: 5,
            notes: 'Analysis failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      // Update weight_history with photo metadata
      const { error: metadataError } = await supabase
        .from('weight_history')
        .update({ photo_metadata: photoAnalyses })
        .eq('id', weightHistoryId);

      if (metadataError) {
        console.error('Error updating photo metadata:', metadataError);
      }
      
      // Refresh photos list
      await loadProgressPhotos();
      toast.success('Fortschrittsfotos hochgeladen');
      return updatedEntry;
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      toast.error('Fehler beim Hochladen der Fortschrittsfotos');
    }
  };

  useEffect(() => {
    loadProgressPhotos();
  }, [user]);

  const updatePhotoMetadata = async (photoId: string, category: 'front' | 'back' | 'side', newCategory: 'front' | 'back' | 'side') => {
    if (!user) return false;

    try {
      // Find the weight history entry
      const entry = photos.find(p => p.id === photoId);
      if (!entry) return false;

      // Get original photo URL that we're changing category for
      const originalPhotoUrl = entry.photo_urls[category];
      if (!originalPhotoUrl) return false;

      // Fetch the current database entry to get the original array format
      const { data: dbEntry, error: fetchError } = await supabase
        .from('weight_history')
        .select('photo_urls, photo_metadata')
        .eq('id', photoId)
        .maybeSingle();

      if (fetchError || !dbEntry) {
        console.error('Error fetching entry:', fetchError);
        return false;
      }

      // Parse the photo_urls (handle both string and array formats)
      let photoUrlsArray = dbEntry.photo_urls;
      if (typeof photoUrlsArray === 'string') {
        try {
          photoUrlsArray = JSON.parse(photoUrlsArray);
        } catch (e) {
          photoUrlsArray = [];
        }
      }

      if (!Array.isArray(photoUrlsArray)) {
        console.error('photo_urls is not an array:', photoUrlsArray);
        return false;
      }

      // Find the index of the photo we're updating
      const categoryToIndex = { front: 0, side: 1, back: 2 };
      const newCategoryToIndex = { front: 0, side: 1, back: 2 };
      
      const currentIndex = categoryToIndex[category];
      const newIndex = newCategoryToIndex[newCategory];
      
      // Find the actual URL in the array (in case order was already changed)
      const actualIndex = photoUrlsArray.findIndex(url => url === originalPhotoUrl);
      if (actualIndex === -1) {
        console.error('Photo URL not found in array:', originalPhotoUrl);
        return false;
      }

      // Create new array with photo moved to correct position
      const newPhotoUrlsArray = [...photoUrlsArray];
      
      // Remove from current position
      const [movedUrl] = newPhotoUrlsArray.splice(actualIndex, 1);
      
      // Insert at new position
      newPhotoUrlsArray.splice(newIndex, 0, movedUrl);
      
      // Ensure array doesn't exceed 3 elements (remove extras from end)
      while (newPhotoUrlsArray.length > 3) {
        newPhotoUrlsArray.pop();
      }

      // Update metadata
      let updatedMetadata = (dbEntry.photo_metadata && typeof dbEntry.photo_metadata === 'object') 
        ? { ...dbEntry.photo_metadata } 
        : {};
      
      // Move or create metadata for the new category
      if (updatedMetadata[category] && category !== newCategory) {
        updatedMetadata[newCategory] = {
          ...updatedMetadata[category],
          view: newCategory,
          updated_manually: true
        };
        delete updatedMetadata[category];
      } else if (!updatedMetadata[newCategory]) {
        updatedMetadata[newCategory] = {
          view: newCategory,
          confidence: 1.0,
          updated_manually: true
        };
      }

      // Update database with both new array and metadata
      const { error } = await supabase
        .from('weight_history')
        .update({ 
          photo_urls: newPhotoUrlsArray,
          photo_metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', photoId);

      if (error) throw error;

      // Update local state - transform array back to object format for UI
      const transformedUrls: any = {};
      newPhotoUrlsArray.forEach((url, index) => {
        if (url && typeof url === 'string' && url.trim() !== '') {
          if (index === 0) transformedUrls.front = url;
          else if (index === 1) transformedUrls.side = url;
          else if (index === 2) transformedUrls.back = url;
        }
      });

      setPhotos(currentPhotos => 
        currentPhotos.map(photo => 
          photo.id === photoId 
            ? { 
                ...photo, 
                photo_urls: transformedUrls,
                photo_metadata: updatedMetadata 
              }
            : photo
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating photo metadata:', error);
      return true;
    }
  };

  return {
    photos,
    loading,
    uploadProgressPhoto,
    startCropWorkflow,
    refreshPhotos: loadProgressPhotos,
    updatePhotoMetadata,
    showCropModal,
    currentCropFile,
    handleCropComplete,
    croppedFiles,
    ProgressPhotoCropModal: () => (
      <ProgressPhotoCropModal
        image={currentCropFile}
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setCurrentCropFile(null);
          setPendingFiles([]);
          setCroppedFiles([]);
          setPendingUploadData(null);
        }}
        onCropComplete={handleCropComplete}
      />
    )
  };
};