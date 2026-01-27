import { useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetConfig, WidgetType, WidgetSize, DEFAULT_WIDGETS, WIDGET_DEFINITIONS } from '@/types/widgets';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'ares_widget_config';
const WIDGET_UPDATE_EVENT = 'widget-config-updated';

// Dispatch custom event to sync all hook instances
const dispatchWidgetUpdate = (newWidgets: WidgetConfig[]) => {
  window.dispatchEvent(new CustomEvent(WIDGET_UPDATE_EVENT, { 
    detail: newWidgets 
  }));
};

export const useWidgetConfig = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    // Initialize from localStorage synchronously to avoid flicker
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return DEFAULT_WIDGETS;
      }
    }
    return DEFAULT_WIDGETS;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Ensure all widget types exist in config
  const ensureAllWidgets = useCallback((existingWidgets: WidgetConfig[]): WidgetConfig[] => {
    const existingTypes = new Set(existingWidgets.map(w => w.type));
    const missingWidgets: WidgetConfig[] = [];
    
    WIDGET_DEFINITIONS.forEach((def, idx) => {
      if (!existingTypes.has(def.type)) {
        missingWidgets.push({
          id: `auto-${def.type}`,
          type: def.type,
          size: def.defaultSize,
          enabled: false,
          order: existingWidgets.length + idx
        });
      }
    });
    
    return [...existingWidgets, ...missingWidgets];
  }, []);

  // Load widgets from DB or localStorage
  const loadWidgets = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('user_widget_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order');

        if (data && data.length > 0 && !error) {
          const mapped: WidgetConfig[] = data.map(d => ({
            id: d.id,
            type: d.widget_type as WidgetType,
            size: d.size as WidgetSize,
            enabled: d.enabled,
            order: d.display_order
          }));
          const complete = ensureAllWidgets(mapped);
          setWidgets(complete);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(complete));
          return;
        }
      }
      
      // Fallback to localStorage (already loaded in initial state)
      const current = ensureAllWidgets(widgets);
      if (current.length !== widgets.length) {
        setWidgets(current);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.error('Failed to load widget config:', e);
    } finally {
      setIsLoading(false);
    }
  }, [ensureAllWidgets, widgets]);

  useEffect(() => {
    loadWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for updates from other hook instances
  useEffect(() => {
    const handleWidgetUpdate = (e: CustomEvent<WidgetConfig[]>) => {
      setWidgets(e.detail);
    };
    
    window.addEventListener(WIDGET_UPDATE_EVENT, handleWidgetUpdate as EventListener);
    return () => {
      window.removeEventListener(WIDGET_UPDATE_EVENT, handleWidgetUpdate as EventListener);
    };
  }, []);

  // Save to DB (fire-and-forget)
  const syncToDb = useCallback(async (newWidgets: WidgetConfig[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert all widgets
      for (const widget of newWidgets) {
        await supabase
          .from('user_widget_preferences')
          .upsert({
            user_id: user.id,
            widget_type: widget.type,
            size: widget.size,
            enabled: widget.enabled,
            display_order: widget.order,
          }, {
            onConflict: 'user_id,widget_type'
          });
      }
    } catch (e) {
      console.error('Failed to sync widget config to DB:', e);
    }
  }, []);

  const updateWidgetSize = useCallback((type: WidgetType, size: WidgetSize) => {
    setWidgets(prev => {
      const newWidgets = prev.map(w => 
        w.type === type ? { ...w, size } : w
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newWidgets));
      syncToDb(newWidgets);
      dispatchWidgetUpdate(newWidgets);
      return newWidgets;
    });
  }, [syncToDb]);

  const toggleWidget = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const newWidgets = prev.map(w => 
        w.type === type ? { ...w, enabled: !w.enabled } : w
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newWidgets));
      syncToDb(newWidgets);
      dispatchWidgetUpdate(newWidgets);
      return newWidgets;
    });
  }, [syncToDb]);

  const reorderWidgets = useCallback((newOrder: WidgetType[]) => {
    setWidgets(prev => {
      const newWidgets = newOrder.map((type, index) => {
        const widget = prev.find(w => w.type === type);
        return widget ? { ...widget, order: index } : null;
      }).filter(Boolean) as WidgetConfig[];
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newWidgets));
      syncToDb(newWidgets);
      dispatchWidgetUpdate(newWidgets);
      return newWidgets;
    });
  }, [syncToDb]);

  // Memoized sorted arrays
  const sortedWidgets = useMemo(() => 
    [...widgets].sort((a, b) => a.order - b.order), 
    [widgets]
  );
  
  const enabledWidgets = useMemo(() => 
    sortedWidgets.filter(w => w.enabled), 
    [sortedWidgets]
  );

  return {
    widgets: sortedWidgets,
    enabledWidgets,
    updateWidgetSize,
    toggleWidget,
    reorderWidgets,
    isLoading
  };
};
