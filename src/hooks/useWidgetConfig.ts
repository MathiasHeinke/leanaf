import { useState, useEffect, useCallback } from 'react';
import { WidgetConfig, WidgetType, WidgetSize, DEFAULT_WIDGETS } from '@/types/widgets';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'ares_widget_config';

export const useWidgetConfig = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isLoading, setIsLoading] = useState(true);

  // Load widgets from DB or localStorage
  const loadWidgets = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try to load from Supabase
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
          setWidgets(mapped);
          return;
        }
      }
      
      // Fallback to localStorage
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setWidgets(parsed);
        } catch {
          setWidgets(DEFAULT_WIDGETS);
        }
      } else {
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch (e) {
      console.error('Failed to load widget config:', e);
      setWidgets(DEFAULT_WIDGETS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Save to both localStorage and DB
  const saveConfig = useCallback(async (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newWidgets));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert each widget preference
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
      console.error('Failed to save widget config to DB:', e);
    }
  }, []);

  const updateWidgetSize = useCallback((type: WidgetType, size: WidgetSize) => {
    const newWidgets = widgets.map(w => 
      w.type === type ? { ...w, size } : w
    );
    saveConfig(newWidgets);
  }, [widgets, saveConfig]);

  const toggleWidget = useCallback((type: WidgetType) => {
    const newWidgets = widgets.map(w => 
      w.type === type ? { ...w, enabled: !w.enabled } : w
    );
    saveConfig(newWidgets);
  }, [widgets, saveConfig]);

  const reorderWidgets = useCallback((newOrder: WidgetType[]) => {
    const newWidgets = newOrder.map((type, index) => {
      const widget = widgets.find(w => w.type === type);
      return widget ? { ...widget, order: index } : null;
    }).filter(Boolean) as WidgetConfig[];
    saveConfig(newWidgets);
  }, [widgets, saveConfig]);

  return {
    widgets: widgets.sort((a, b) => a.order - b.order),
    enabledWidgets: widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order),
    updateWidgetSize,
    toggleWidget,
    reorderWidgets,
    isLoading
  };
};
