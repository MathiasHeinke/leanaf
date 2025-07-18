import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Heart, 
  ChefHat, 
  Quote, 
  Trash2, 
  Star,
  Clock,
  Calendar,
  Bookmark
} from "lucide-react";

interface SavedItem {
  id: string;
  type: 'recipe' | 'quote' | 'tip';
  title: string;
  content: string;
  metadata?: any;
  created_at: string;
}

export const SavedItems = () => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recipe' | 'quote' | 'tip'>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSavedItems();
    }
  }, [user]);

  const loadSavedItems = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Temporarily using dummy data until types are updated
      setSavedItems([]);
    } catch (error: any) {
      console.error('Error loading saved items:', error);
      toast.error('Fehler beim Laden der gespeicherten Inhalte');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      // Temporarily disabled until types are updated
      setSavedItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Element entfernt');
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast.error('Fehler beim Entfernen');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'recipe': return <ChefHat className="h-4 w-4" />;
      case 'quote': return <Quote className="h-4 w-4" />;
      case 'tip': return <Star className="h-4 w-4" />;
      default: return <Bookmark className="h-4 w-4" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'recipe': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'quote': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'tip': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredItems = savedItems.filter(item => 
    activeFilter === 'all' || item.type === activeFilter
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
          className="h-8"
        >
          Alle ({savedItems.length})
        </Button>
        <Button
          variant={activeFilter === 'recipe' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('recipe')}
          className="h-8"
        >
          <ChefHat className="h-3 w-3 mr-1" />
          Rezepte ({savedItems.filter(i => i.type === 'recipe').length})
        </Button>
        <Button
          variant={activeFilter === 'quote' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('quote')}
          className="h-8"
        >
          <Quote className="h-3 w-3 mr-1" />
          Sprüche ({savedItems.filter(i => i.type === 'quote').length})
        </Button>
        <Button
          variant={activeFilter === 'tip' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('tip')}
          className="h-8"
        >
          <Star className="h-3 w-3 mr-1" />
          Tipps ({savedItems.filter(i => i.type === 'tip').length})
        </Button>
      </div>

      {/* Items List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">Keine gespeicherten Inhalte</h3>
                <p className="text-sm">
                  {activeFilter === 'all' 
                    ? 'Du hast noch keine Rezepte, Sprüche oder Tipps gespeichert.'
                    : `Du hast noch keine ${
                        activeFilter === 'recipe' ? 'Rezepte' :
                        activeFilter === 'quote' ? 'Sprüche' : 'Tipps'
                      } gespeichert.`
                  }
                </p>
              </div>
            </Card>
          ) : (
            filteredItems.map((item, index) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getItemColor(item.type)}>
                        {getItemIcon(item.type)}
                        <span className="ml-1 capitalize">{item.type}</span>
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <h4 className="font-medium mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.content}
                  </p>
                  
                  {/* Recipe specific metadata */}
                  {item.type === 'recipe' && item.metadata && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {item.metadata.calories && (
                        <Badge variant="secondary" className="text-xs">
                          {item.metadata.calories} kcal
                        </Badge>
                      )}
                      {item.metadata.protein && (
                        <Badge variant="secondary" className="text-xs">
                          {item.metadata.protein}g Protein
                        </Badge>
                      )}
                      {item.metadata.mealType && (
                        <Badge variant="secondary" className="text-xs">
                          {item.metadata.mealType}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};