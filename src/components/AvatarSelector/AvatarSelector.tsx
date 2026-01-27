import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ChevronDown, Images } from 'lucide-react';
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
  /** When true, renders without Card wrapper (for embedding in parent card) */
  embedded?: boolean;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentAvatarUrl,
  currentPresetId,
  avatarType = 'preset',
  onAvatarChange,
  embedded = false
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const handlePresetSelect = (presetId: string, avatarUrl: string) => {
    onAvatarChange(avatarUrl, 'preset', presetId);
    setPresetsOpen(false);
  };

  const handleUploadClick = () => {
    setShowUpload(true);
    setPresetsOpen(false);
  };

  const handleImageSelected = (file: File) => {
    setImageToCrop(file);
    setCropModalOpen(true);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    onAvatarChange(croppedImageUrl, 'uploaded');
    setCropModalOpen(false);
    setImageToCrop(null);
    setShowUpload(false);
  };

  const content = (
    <div className="space-y-3">
      {/* Action Row */}
      <div className="flex items-center gap-2">
        <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen} className="flex-1">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "w-full justify-between h-9 text-xs",
                presetsOpen && "bg-primary/5 border-primary/30"
              )}
            >
              <span className="flex items-center gap-2">
                <Images className="h-3.5 w-3.5" />
                Vorlagen wählen
              </span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                presetsOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3">
            <AvatarPresetGrid
              selectedPresetId={avatarType === 'preset' ? currentPresetId : undefined}
              onPresetSelect={handlePresetSelect}
            />
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          className="h-9 text-xs gap-1.5 shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
          Hochladen
        </Button>
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
    </div>
  );

  // Embedded mode: no card wrapper
  if (embedded) {
    return content;
  }

  // Standalone mode: with card wrapper (legacy support)
  return (
    <Card>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
};
