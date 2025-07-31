
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { UploadProgress as UploadProgressType } from "@/utils/uploadHelpers";

interface UploadProgressProps {
  progress: UploadProgressType[];
  isVisible: boolean;
}

export const UploadProgress = ({ progress, isVisible }: UploadProgressProps) => {
  if (!isVisible || progress.length === 0) return null;

  const totalProgress = Math.round(
    progress.reduce((sum, item) => sum + item.progress, 0) / progress.length
  );

  const completedCount = progress.filter(item => item.status === 'completed').length;
  const errorCount = progress.filter(item => item.status === 'error').length;
  const uploadingCount = progress.filter(item => item.status === 'uploading').length;

  // Calculate upload speed and ETA
  const activeUploads = progress.filter(item => item.status === 'uploading');
  const avgProgress = activeUploads.length > 0 
    ? activeUploads.reduce((sum, item) => sum + item.progress, 0) / activeUploads.length 
    : 0;

  return (
    <div className="mb-4 p-4 bg-card/95 backdrop-blur-md rounded-xl border border-border/50 animate-fade-in shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Upload-Fortschritt ({completedCount}/{progress.length})
          </span>
          {uploadingCount > 0 && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              {uploadingCount} aktiv
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-muted-foreground">{totalProgress}%</div>
          {uploadingCount > 0 && avgProgress > 0 && (
            <div className="text-xs text-muted-foreground">
              ~{Math.ceil((100 - avgProgress) / 2)}s
            </div>
          )}
        </div>
      </div>
      
      <Progress value={totalProgress} className="mb-3 h-2" />
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {progress.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              {item.status === 'completed' && (
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
              )}
              {item.status === 'error' && (
                <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
              {item.status === 'uploading' && (
                <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
              )}
              {item.status === 'pending' && (
                <div className="h-3 w-3 rounded-full bg-muted flex-shrink-0" />
              )}
              
              <span className="truncate flex-1 text-foreground font-medium">
                {item.fileName}
              </span>
              
              {item.status === 'uploading' && (
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(item.progress)}%
                </span>
              )}
              
              {item.status === 'error' && item.error && (
                <span className="text-red-500 text-xs max-w-32 truncate">
                  {item.error}
                </span>
              )}
            </div>
            
            {item.status === 'uploading' && (
              <Progress value={item.progress} className="h-1" />
            )}
          </div>
        ))}
      </div>
      
      {errorCount > 0 && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {errorCount} Datei(en) fehlgeschlagen
          </div>
        </div>
      )}
    </div>
  );
};
