import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export const CoachBanner = () => {
  const [open, setOpen] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCoachClick = () => {
    navigate('/coach');
  };

  // Nur anzeigen wenn:
  // 1. User eingeloggt ist
  // 2. NICHT auf Coach-Seiten (/coach oder /coach/:id)
  const isCoachPage = location.pathname.startsWith('/coach');
  if (!user || isCoachPage) return null;

  return (
    <div
      id="coachBar"
      className={clsx(
        'fixed left-0 right-0 z-40 transition-transform duration-300',
        open ? 'translate-y-0' : '-translate-y-full',
        'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg'
      )}
      style={{ top: '61px' }} // Fixed header height
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 p-3">
        {/* Coach-Avatar */}
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-sm font-bold">🤖</span>
        </div>
        
        <span 
          className="flex-1 text-sm cursor-pointer hover:underline"
          onClick={handleCoachClick}
        >
          Dein AI-Coach ist bereit! Stelle eine Frage oder wähle einen Spezialisten…
        </span>

        {/* Toggle-Button */}
        <button
          id="coachToggle"
          aria-label={open ? 'Banner einklappen' : 'Banner ausklappen'}
          className="rounded-full p-1 hover:bg-white/20 transition-colors duration-200"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
    </div>
  );
};