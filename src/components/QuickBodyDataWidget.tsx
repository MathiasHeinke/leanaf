import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale, Ruler, TrendingUp, TrendingDown, Minus, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BodyData {
  weight: {
    current: number;
    change: number;
    date: string;
  } | null;
  measurements: {
    waist: number;
    chest: number;
    arms: number;
    date: string;
  } | null;
  photos: {
    count: number;
    lastDate: string;
  } | null;
}

export const QuickBodyDataWidget: React.FC = () => {
  const { user } = useAuth();
  const [bodyData, setBodyData] = useState<BodyData>({
    weight: null,
    measurements: null,
    photos: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBodyData();
    }
  }, [user]);

  const loadBodyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load weight data
      const { data: weightData } = await supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(2);

      // Load measurements data
      const { data: measurementsData } = await supabase
        .from('body_measurements')
        .select('waist, chest, arms, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);

      // Load photos data
      const { data: photosData } = await supabase
        .from('weight_history')
        .select('photo_urls, date')
        .eq('user_id', user.id)
        .not('photo_urls', 'is', null)
        .order('date', { ascending: false })
        .limit(5);

      let weight = null;
      if (weightData && weightData.length > 0) {
        const current = weightData[0];
        const previous = weightData[1];
        weight = {
          current: current.weight,
          change: previous ? current.weight - previous.weight : 0,
          date: current.date
        };
      }

      let measurements = null;
      if (measurementsData && measurementsData.length > 0) {
        const latest = measurementsData[0];
        measurements = {
          waist: latest.waist || 0,
          chest: latest.chest || 0,
          arms: latest.arms || 0,
          date: latest.date
        };
      }

      let photos = null;
      if (photosData && photosData.length > 0) {
        const totalPhotos = photosData.reduce((sum, entry) => {
          const urls = Array.isArray(entry.photo_urls) ? entry.photo_urls : 
                      typeof entry.photo_urls === 'string' ? JSON.parse(entry.photo_urls || '[]') : [];
          return sum + urls.length;
        }, 0);
        
        photos = {
          count: totalPhotos,
          lastDate: photosData[0].date
        };
      }

      setBodyData({ weight, measurements, photos });
    } catch (error) {
      console.error('Error loading body data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Scale className="h-4 w-4" />
            Körperdaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Lade Daten...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <Scale className="h-4 w-4" />
          Körperdaten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weight Section */}
        {bodyData.weight ? (
          <div className="bg-background/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Gewicht</span>
              </div>
              <div className="flex items-center gap-1">
                {bodyData.weight.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : bodyData.weight.change < 0 ? (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                ) : (
                  <Minus className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${
                  bodyData.weight.change > 0 ? 'text-red-600' : 
                  bodyData.weight.change < 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {bodyData.weight.change > 0 ? '+' : ''}{bodyData.weight.change.toFixed(1)}kg
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {bodyData.weight.current.toFixed(1)} kg
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(bodyData.weight.date)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-background/50 rounded-lg p-3 border border-dashed border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Scale className="h-4 w-4" />
              <span className="text-sm">Noch kein Gewicht erfasst</span>
            </div>
          </div>
        )}

        {/* Measurements Section */}
        {bodyData.measurements ? (
          <div className="bg-background/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Körpermaße</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {bodyData.measurements.waist > 0 && (
                <div className="text-center">
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {bodyData.measurements.waist}cm
                  </div>
                  <div className="text-muted-foreground">Taille</div>
                </div>
              )}
              {bodyData.measurements.chest > 0 && (
                <div className="text-center">
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {bodyData.measurements.chest}cm
                  </div>
                  <div className="text-muted-foreground">Brust</div>
                </div>
              )}
              {bodyData.measurements.arms > 0 && (
                <div className="text-center">
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {bodyData.measurements.arms}cm
                  </div>
                  <div className="text-muted-foreground">Arme</div>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-center">
              {formatDate(bodyData.measurements.date)}
            </div>
          </div>
        ) : (
          <div className="bg-background/50 rounded-lg p-3 border border-dashed border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ruler className="h-4 w-4" />
              <span className="text-sm">Noch keine Maße erfasst</span>
            </div>
          </div>
        )}

        {/* Photos Section */}
        {bodyData.photos ? (
          <div className="bg-background/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Fortschrittsfotos</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {bodyData.photos.count} Fotos
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Letztes Foto: {formatDate(bodyData.photos.lastDate)}
            </div>
          </div>
        ) : (
          <div className="bg-background/50 rounded-lg p-3 border border-dashed border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span className="text-sm">Noch keine Fotos erfasst</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          💡 Erfasse deine Daten über die Index-Seite
        </div>
      </CardContent>
    </Card>
  );
};