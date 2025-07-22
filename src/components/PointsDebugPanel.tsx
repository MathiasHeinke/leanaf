
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Bug, Plus, Minus, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';

interface PointsDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_DATA = [
  { level: 1, name: 'Rookie', pointsRequired: 0, pointsToNext: 100 },
  { level: 2, name: 'Bronze', pointsRequired: 100, pointsToNext: 200 },
  { level: 3, name: 'Silver', pointsRequired: 200, pointsToNext: 350 },
  { level: 4, name: 'Gold', pointsRequired: 350, pointsToNext: 550 },
  { level: 5, name: 'Platinum', pointsRequired: 550, pointsToNext: 800 },
  { level: 6, name: 'Diamond', pointsRequired: 800, pointsToNext: 1100 },
  { level: 7, name: 'Master', pointsRequired: 1100, pointsToNext: 1500 },
  { level: 8, name: 'Grandmaster', pointsRequired: 1500, pointsToNext: 2000 },
];

export const PointsDebugPanel = ({ isOpen, onClose }: PointsDebugPanelProps) => {
  const { user } = useAuth();
  const { userPoints, refreshData } = usePointsSystem();
  const [newPoints, setNewPoints] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetPoints = async (targetPoints: number) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Calculate the difference
      const currentPoints = userPoints?.total_points || 0;
      const pointsDifference = targetPoints - currentPoints;
      
      if (pointsDifference === 0) {
        toast.info('Keine Änderung nötig');
        return;
      }
      
      // Use the existing function to award or subtract points
      await supabase.rpc('update_user_points_and_level', {
        p_user_id: user.id,
        p_points: pointsDifference,
        p_activity_type: 'debug_adjustment',
        p_description: `Debug: Punkte manuell auf ${targetPoints} gesetzt`,
        p_multiplier: 1.0,
        p_trial_multiplier: 1.0
      });
      
      toast.success(`Punkte auf ${targetPoints} gesetzt`);
      refreshData();
      setNewPoints('');
    } catch (error) {
      console.error('Fehler beim Setzen der Punkte:', error);
      toast.error('Fehler beim Setzen der Punkte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToLevel1 = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // First, reset to 0 points
      const currentPoints = userPoints?.total_points || 0;
      if (currentPoints > 0) {
        await supabase.rpc('update_user_points_and_level', {
          p_user_id: user.id,
          p_points: -currentPoints,
          p_activity_type: 'debug_reset',
          p_description: 'Debug: Kompletter Reset auf Level 1',
          p_multiplier: 1.0,
          p_trial_multiplier: 1.0
        });
      }
      
      // Then manually set level data to ensure proper reset
      await supabase
        .from('user_points')
        .update({
          total_points: 0,
          current_level: 1,
          level_name: 'Rookie',
          points_to_next_level: 100,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      toast.success('Erfolgreich auf Level 1 zurückgesetzt!');
      refreshData();
    } catch (error) {
      console.error('Fehler beim Reset:', error);
      toast.error('Fehler beim Zurücksetzen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const currentPoints = userPoints?.total_points || 0;
    
    switch (action) {
      case 'add100':
        handleSetPoints(currentPoints + 100);
        break;
      case 'sub100':
        handleSetPoints(Math.max(0, currentPoints - 100));
        break;
      case 'nextLevel':
        const nextLevelData = LEVEL_DATA.find(l => l.level === (userPoints?.current_level || 1) + 1);
        if (nextLevelData) {
          handleSetPoints(nextLevelData.pointsRequired);
        }
        break;
      case 'prevLevel':
        const prevLevelData = LEVEL_DATA.find(l => l.level === Math.max(1, (userPoints?.current_level || 1) - 1));
        if (prevLevelData) {
          handleSetPoints(prevLevelData.pointsRequired);
        }
        break;
      case 'reset':
        handleResetToLevel1();
        break;
    }
  };

  const handleCustomSetPoints = () => {
    const points = parseInt(newPoints);
    if (isNaN(points) || points < 0) {
      toast.error('Bitte gib eine gültige Punktezahl ein');
      return;
    }
    handleSetPoints(points);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Punkte-System Debug-Konsole
          </DialogTitle>
          <DialogDescription>
            Hier kannst du deine Punkte und Level für Debug-Zwecke anpassen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Aktueller Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Gesamtpunkte</Label>
                <div className="text-2xl font-bold">{userPoints?.total_points || 0}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Level</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{userPoints?.current_level || 1}</span>
                  <Badge variant="outline">{userPoints?.level_name || 'Rookie'}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Punkte bis nächstes Level</Label>
                <div className="text-lg">{userPoints?.points_to_next_level || 100}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Schnelle Aktionen</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('add100')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                +100 Punkte
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('sub100')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Minus className="h-4 w-4" />
                -100 Punkte
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('nextLevel')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <ChevronUp className="h-4 w-4" />
                Nächstes Level
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('prevLevel')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <ChevronDown className="h-4 w-4" />
                Voriges Level
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('reset')}
                disabled={isLoading}
                className="flex items-center gap-1 text-destructive"
              >
                <RotateCcw className="h-4 w-4" />
                Reset (0 Punkte)
              </Button>
            </div>
          </div>

          <Separator />

          {/* Custom Points Input */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Punkte manuell setzen</h3>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Neue Punktezahl eingeben..."
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                min="0"
              />
              <Button
                onClick={handleCustomSetPoints}
                disabled={isLoading || !newPoints}
              >
                Setzen
              </Button>
            </div>
          </div>

          <Separator />

          {/* Level Overview */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Level-Übersicht</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {LEVEL_DATA.map((level) => (
                <div
                  key={level.level}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    level.level === userPoints?.current_level 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold w-8">
                      {level.level}
                    </div>
                    <Badge 
                      variant={level.level === userPoints?.current_level ? 'default' : 'outline'}
                    >
                      {level.name}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Ab {level.pointsRequired} Punkte
                    </div>
                    {level.level < LEVEL_DATA.length && (
                      <div className="text-xs text-muted-foreground">
                        Nächstes Level: {level.pointsToNext} Punkte
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              ⚠️ Dies ist eine Debug-Funktion. Verwende sie nur zu Testzwecken.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
