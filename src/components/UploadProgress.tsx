
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

  return (
    <div className="mb-4 p-3 bg-card/95 backdrop-blur-md rounded-xl border border-border/50 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          Upload-Fortschritt ({completedCount}/{progress.length})
        </span>
        <span className="text-sm text-muted-foreground">{totalProgress}%</span>
      </div>
      
      <Progress value={totalProgress} className="mb-3" />
      
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {progress.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {item.status === 'completed' && (
              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
            )}
            {item.status === 'error' && (
              <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
            )}
            {item.status === 'uploading' && (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
            )}
            {item.status === 'pending' && (
              <div className="h-3 w-3 rounded-full bg-muted flex-shrink-0" />
            )}
            
            <span className="truncate flex-1 text-muted-foreground">
              {item.fileName}
            </span>
            
            {item.status === 'error' && item.error && (
              <span className="text-red-500 text-xs">
                {item.error}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {errorCount > 0 && (
        <div className="mt-2 text-xs text-red-500">
          {errorCount} Datei(en) konnten nicht hochgeladen werden
        </div>
      )}
    </div>
  );
};
