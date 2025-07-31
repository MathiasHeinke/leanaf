import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstantImagePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  className?: string;
}

export const InstantImagePreview = ({ files, onRemove, className }: InstantImagePreviewProps) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);

  useEffect(() => {
    const newPreviews: string[] = [];
    const newLoading: boolean[] = [];

    files.forEach((file, index) => {
      newLoading[index] = true;
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews[index] = e.target?.result as string;
          setLoading(prev => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
          });
          setPreviews([...newPreviews]);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, show placeholder
        newPreviews[index] = '';
        newLoading[index] = false;
      }
    });

    setPreviews(newPreviews);
    setLoading(newLoading);

    // Cleanup URLs on unmount
    return () => {
      newPreviews.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
      {files.map((file, index) => (
        <div key={index} className="relative group">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
            {loading[index] ? (
              <Skeleton className="w-full h-full" />
            ) : file.type.startsWith('image/') ? (
              <img
                src={previews[index]}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <div className="text-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground truncate max-w-16 block">
                    {file.name}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 shadow-lg"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
          
          {/* File name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {file.name}
          </div>
        </div>
      ))}
    </div>
  );
};