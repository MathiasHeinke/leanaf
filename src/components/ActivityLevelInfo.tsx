
import { Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityLevelInfoProps {
  activityLevel: string;
  bmr?: number;
  tdee?: number;
}

const ActivityLevelInfo = ({ activityLevel, bmr, tdee }: ActivityLevelInfoProps) => {
  const getActivityLevelData = (level: string) => {
    const data = {
      sedentary: {
        multiplier: 1.2,
        title: 'Inaktiv',
        description: 'Bürojob, wenig Bewegung',
        examples: [
          'Bürojob ohne regelmäßigen Sport',
          'Hauptsächlich sitzende Tätigkeiten',
          'Weniger als 2 Stunden Bewegung pro Woche'
        ],
        color: 'bg-gray-100 text-gray-800',
        warning: false
      },
      light: {
        multiplier: 1.375,
        title: 'Leicht aktiv',
        description: 'Bürojob + gelegentlicher Sport',
        examples: [
          'Bürojob + 1-2x pro Woche Sport',
          'Regelmäßige Spaziergänge',
          '2-3 Stunden leichte Aktivität pro Woche'
        ],
        color: 'bg-blue-100 text-blue-800',
        warning: false
      },
      moderate: {
        multiplier: 1.55,
        title: 'Mäßig aktiv',
        description: '3-4x Sport/Woche oder aktiver Job',
        examples: [
          'Bürojob + 3-4x Sport pro Woche',
          'Körperlich aktiver Job (Verkäufer, Lehrer)',
          'Regelmäßige moderate Aktivität'
        ],
        color: 'bg-green-100 text-green-800',
        warning: false
      },
      active: {
        multiplier: 1.725,
        title: 'Sehr aktiv',
        description: '4-5x Training oder körperlicher Job',
        examples: [
          'Regelmäßiges Training 4-5x pro Woche',
          'Körperlich anspruchsvoller Job (Handwerker)',
          'Hohe tägliche Aktivität'
        ],
        color: 'bg-orange-100 text-orange-800',
        warning: false
      },
      very_active: {
        multiplier: 1.9,
        title: 'Extrem aktiv',
        description: '6-7x Training + körperlicher Job',
        examples: [
          'Intensives Training fast täglich',
          'Sehr körperlicher Job + zusätzlicher Sport',
          'Profisportler oder ähnliches Aktivitätsniveau'
        ],
        color: 'bg-red-100 text-red-800',
        warning: true
      }
    };

    return data[level as keyof typeof data] || data.moderate;
  };

  const levelData = getActivityLevelData(activityLevel);

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {levelData.warning ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <Info className="h-5 w-5 text-blue-500" />
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={levelData.color}>
                {levelData.title} ({levelData.multiplier}x)
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">{levelData.description}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Typische Beispiele:</p>
                <ul className="list-disc list-inside space-y-1">
                  {levelData.examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>
            </div>

            {bmr && tdee && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Grundumsatz:</span>
                    <span className="font-bold ml-2">{Math.round(bmr)} kcal</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gesamtumsatz:</span>
                    <span className="font-bold ml-2">{tdee} kcal</span>
                  </div>
                </div>
              </div>
            )}

            {levelData.warning && (
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  ⚠️ Sehr hoher Aktivitätslevel - Stelle sicher, dass dies realistisch zu deinem Alltag passt, um genaue Kalorienziele zu erhalten.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLevelInfo;
