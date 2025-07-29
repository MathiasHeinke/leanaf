import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachHeaderProps {
  name: string;
  avatarUrl?: string;
  tag?: string;
  onBack: () => void;
  onHistory: () => void;
  onDelete: () => void;
  className?: string;
}

export const CoachHeader = ({ 
  name, 
  avatarUrl, 
  tag, 
  onBack, 
  onHistory, 
  onDelete,
  className = ""
}: CoachHeaderProps) => {
  return (
    <div className={`flex items-center justify-between px-4 py-2 bg-black text-white h-16 ${className}`}>
      {/* Left: Zurück + Avatar + Name */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-white hover:bg-white/10 h-8 w-8 p-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={name} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold ${avatarUrl ? 'hidden' : ''}`}>
            {name.charAt(0)}
          </div>
        </div>
        
        <div className="flex flex-col text-sm leading-tight">
          <span className="font-medium text-white">{name}</span>
          {tag && <span className="text-xs text-neutral-400">{tag}</span>}
        </div>
      </div>

      {/* Right: History + Delete */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onHistory}
          className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
        >
          <History className="w-5 h-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};