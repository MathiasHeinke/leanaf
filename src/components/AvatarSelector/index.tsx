import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { AvatarPresetGrid } from './AvatarPresetGrid';
import { AvatarUploadZone } from './AvatarUploadZone';
import { AvatarCropModal } from './AvatarCropModal';

interface AvatarSelectorProps {
  currentAvatarUrl?: string;
  currentPresetId?: string;
  avatarType?: 'preset' | 'uploaded';
  onAvatarChange: (avatarUrl: string, avatarType: 'preset' | 'uploaded', presetId?: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentAvatarUrl,
  currentPresetId,
  avatarType = 'preset',
  onAvatarChange
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);

  const handlePresetSelect = (presetId: string, avatarUrl: string) => {
    onAvatarChange(avatarUrl, 'preset', presetId);
  };

  const handleUploadClick = () => {
    setShowUpload(true);
  };

  const handleImageSelected = (file: File) => {
    setImageToCrop(file);
    setCropModalOpen(true);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    onAvatarChange(croppedImageUrl, 'uploaded');
    setCropModalOpen(false);
    setImageToCrop(null);
  };

  const getCurrentAvatar = () => {
    if (!currentAvatarUrl) return null;
    
    return (
      <div className="flex items-center gap-3 mb-4">
        <img
          src={currentAvatarUrl}
          alt="Current Avatar"
          className="w-16 h-16 rounded-full object-cover border-2 border-border"
        />
        <div className="text-sm text-muted-foreground">
          Aktueller Avatar ({avatarType === 'preset' ? 'Vorlage' : 'Hochgeladen'})
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            👤
          </div>
          Profilbild auswählen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {getCurrentAvatar()}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Avatar-Vorlagen</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Eigenes Bild
            </Button>
          </div>
          
          <AvatarPresetGrid
            selectedPresetId={avatarType === 'preset' ? currentPresetId : undefined}
            onPresetSelect={handlePresetSelect}
          />
        </div>

        {showUpload && (
          <AvatarUploadZone
            onImageSelected={handleImageSelected}
            onCancel={() => setShowUpload(false)}
          />
        )}

        {cropModalOpen && imageToCrop && (
          <AvatarCropModal
            image={imageToCrop}
            isOpen={cropModalOpen}
            onClose={() => setCropModalOpen(false)}
            onCropComplete={handleCropComplete}
          />
        )}
      </CardContent>
    </Card>
  );
};