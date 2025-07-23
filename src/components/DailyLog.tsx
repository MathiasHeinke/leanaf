import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Utensils, Dumbbell, Moon } from 'lucide-react';

export const DailyLog = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tagesprotokoll</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-16 flex flex-col items-center gap-2">
            <Utensils className="h-5 w-5" />
            <span className="text-sm">Mahlzeit hinzufügen</span>
          </Button>
          
          <Button variant="outline" className="h-16 flex flex-col items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            <span className="text-sm">Training eintragen</span>
          </Button>
          
          <Button variant="outline" className="h-16 flex flex-col items-center gap-2">
            <Moon className="h-5 w-5" />
            <span className="text-sm">Schlaf protokollieren</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Heutige Einträge</h4>
          <div className="text-sm text-muted-foreground">
            Noch keine Einträge für heute. Füge deine erste Mahlzeit hinzu!
          </div>
        </div>
      </CardContent>
    </Card>
  );
};