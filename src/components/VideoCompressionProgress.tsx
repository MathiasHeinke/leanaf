import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  VideoIcon, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { CompressionProgress } from '@/utils/videoCompression';

interface VideoCompressionProgressProps {
  progress: CompressionProgress;
  fileName: string;
  originalSize: number;
  className?: string;
}

export const VideoCompressionProgress: React.FC<VideoCompressionProgressProps> = ({
  progress,
  fileName,
  originalSize,
  className = ""
}) => {
  const getStageText = (stage: CompressionProgress['stage']) => {
    switch (stage) {
      case 'analyzing':
        return 'Video wird analysiert...';
      case 'compressing':
        return 'Video wird komprimiert...';
      case 'finalizing':
        return 'Komprimierung wird abgeschlossen...';
      default:
        return 'Verarbeitung läuft...';
    }
  };

  const getStageIcon = (stage: CompressionProgress['stage']) => {
    switch (stage) {
      case 'analyzing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'compressing':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      case 'finalizing':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <VideoIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStageIcon(progress.stage)}
              <span className="font-medium text-sm">{fileName}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatFileSize(originalSize)}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{getStageText(progress.stage)}</span>
              <span>{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* Time Estimate */}
          {progress.estimatedTime && progress.estimatedTime > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Noch ca. {progress.estimatedTime}s</span>
            </div>
          )}

          {/* Stage-specific info */}
          <div className="text-xs text-muted-foreground">
            {progress.stage === 'analyzing' && (
              "Videoeigenschaften werden ermittelt..."
            )}
            {progress.stage === 'compressing' && (
              "Video wird für optimale Qualität und Größe angepasst..."
            )}
            {progress.stage === 'finalizing' && (
              "Komprimiertes Video wird erstellt..."
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};