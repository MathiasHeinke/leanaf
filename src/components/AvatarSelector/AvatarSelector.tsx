import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AvatarPresetGrid } from './AvatarPresetGrid';
import { AvatarUploadZone } from './AvatarUploadZone';
import { AvatarCropModal } from './AvatarCropModal';
import { cn } from '@/lib/utils';

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
  const [presetsOpen, setPresetsOpen] = useState(false);

  const handlePresetSelect = (presetId: string, avatarUrl: string) => {
    onAvatarChange(avatarUrl, 'preset', presetId);
    setPresetsOpen(false); // Close accordion after selection
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            👤
          </div>
          Profilbild
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Avatar Display */}
        {currentAvatarUrl && (
          <div className="flex items-center gap-3">
            <img
              src={currentAvatarUrl}
              alt="Current Avatar"
              className="w-14 h-14 rounded-full object-cover border-2 border-border"
            />
            <div className="text-sm text-muted-foreground">
              Aktueller Avatar ({avatarType === 'preset' ? 'Vorlage' : 'Hochgeladen'})
            </div>
          </div>
        )}
        
        {/* Avatar Presets in Collapsible Accordion */}
        <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-0 hover:bg-transparent">
                <span className="font-medium">Avatar-Vorlagen</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  presetsOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
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
          
          <CollapsibleContent className="pt-3">
            <AvatarPresetGrid
              selectedPresetId={avatarType === 'preset' ? currentPresetId : undefined}
              onPresetSelect={handlePresetSelect}
            />
          </CollapsibleContent>
        </Collapsible>

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
