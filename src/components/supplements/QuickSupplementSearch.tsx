import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupplementLibrary, SUPPLEMENT_LIBRARY_KEYS } from '@/hooks/useSupplementLibrary';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseScheduleFromProtocol } from '@/lib/schedule-utils';
import { PREFERRED_TIMING_LABELS, type PreferredTiming, type SupplementLibraryItem } from '@/types/supplementLibrary';

interface QuickSupplementSearchProps {
  timing: PreferredTiming;
  onAdd?: () => void;
  className?: string;
}

/**
 * QuickSupplementSearch - Inline search field for rapid supplement addition
 * Features:
 * - Debounced search against supplement library
 * - Dropdown with max 5 results
 * - Adds supplement directly to specified timing slot
 * - Touch-friendly 40px height
 */
export const QuickSupplementSearch: React.FC<QuickSupplementSearchProps> = ({
  timing,
  onAdd,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: library = [], isLoading } = useSupplementLibrary();
  
  // Filter results based on query
  const filteredResults = query.length >= 2
    ? library
        .filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.category?.toLowerCase().includes(query.toLowerCase()) ||
          item.recognition_keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 5)
    : [];
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);
  
  // Handle supplement selection with direct insert using the specified timing
  const handleSelect = useCallback(async (item: SupplementLibraryItem) => {
    if (!user?.id) {
      toast.error('Bitte zuerst anmelden');
      return;
    }
    
    setIsAdding(true);
    try {
      // Parse cycle schedule if needed
      const schedule = item.cycling_required
        ? parseScheduleFromProtocol(item.cycling_protocol)
        : { type: 'daily' as const };
      
      // Direct insert with overridden timing
      const { error } = await supabase.from('user_supplements').upsert(
        {
          user_id: user.id,
          supplement_id: item.id,
          name: item.name,
          dosage: item.default_dosage || '',
          unit: item.default_unit || 'mg',
          preferred_timing: timing, // Use the specified timing slot!
          timing: [timing],
          schedule: schedule as any,
          is_active: true,
        },
        { onConflict: 'user_id,supplement_id' }
      );

      if (error) throw error;
      
      const timingLabel = PREFERRED_TIMING_LABELS[timing] || timing;
      toast.success(`${item.name} zu ${timingLabel} hinzugefügt`);
      
      // Invalidate queries and dispatch event
      queryClient.invalidateQueries({ queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user.id) });
      window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
      
      // Reset state
      setQuery('');
      setIsOpen(false);
      onAdd?.();
    } catch (error) {
      console.error('Failed to add supplement:', error);
      toast.error('Fehler beim Hinzufügen');
    } finally {
      setIsAdding(false);
    }
  }, [user?.id, timing, queryClient, onAdd]);
  
  // Handle input change with debounce effect
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };
  
  // Handle focus
  const handleFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative z-20', className)}>
      {/* Search Input */}
      <div className={cn(
        'flex items-center gap-2 h-10 px-3 rounded-lg',
        'bg-background/60 border border-dashed border-border/50',
        'transition-colors',
        isOpen && 'border-primary/50 bg-background/80'
      )}>
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Supplement suchen..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={cn(
            'flex-1 h-8 border-0 bg-transparent p-0',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'placeholder:text-muted-foreground/70 text-sm'
          )}
          disabled={isAdding}
        />
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'h-6 w-6 rounded-full flex-shrink-0',
            'bg-primary/10 hover:bg-primary/20 text-primary'
          )}
          disabled={isAdding || isLoading}
          onClick={() => inputRef.current?.focus()}
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      
      {/* Dropdown Results - rendered via Portal */}
      {isOpen && filteredResults.length > 0 && createPortal(
        <div 
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
          className={cn(
            'z-[9999] bg-popover border border-border rounded-lg shadow-xl',
            'max-h-60 overflow-y-auto'
          )}
        >
          {filteredResults.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={isAdding}
              className={cn(
                'w-full px-3 py-2.5 flex items-center justify-between gap-2',
                'text-left text-sm hover:bg-accent transition-colors',
                'first:rounded-t-lg last:rounded-b-lg',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.category}
                  {item.default_dosage && ` · ${item.default_dosage}${item.default_unit}`}
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>,
        document.body
      )}
      
      {/* No results message - also via Portal */}
      {isOpen && query.length >= 2 && filteredResults.length === 0 && !isLoading && createPortal(
        <div 
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
          className={cn(
            'z-[9999] bg-popover border border-border rounded-lg shadow-lg',
            'px-3 py-4 text-center text-sm text-muted-foreground'
          )}
        >
          Kein Supplement gefunden
        </div>,
        document.body
      )}
    </div>
  );
};

export default QuickSupplementSearch;
