import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Dna, Timer, Activity, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FastingProtocol = '16:8' | '24h' | 'extended';

interface LongevitySettingsProps {
  rapamycinDay: string;
  onRapamycinDayChange: (day: string) => void;
  fastingProtocol: FastingProtocol;
  onFastingProtocolChange: (protocol: FastingProtocol) => void;
  trackDunedinPace: boolean;
  onTrackDunedinPaceChange: (track: boolean) => void;
  trackSenolytics: boolean;
  onTrackSenolyticsChange: (track: boolean) => void;
}

const weekdays = [
  { value: 'monday', label: 'Montag' },
  { value: 'tuesday', label: 'Dienstag' },
  { value: 'wednesday', label: 'Mittwoch' },
  { value: 'thursday', label: 'Donnerstag' },
  { value: 'friday', label: 'Freitag' },
  { value: 'saturday', label: 'Samstag' },
  { value: 'sunday', label: 'Sonntag' },
];

const fastingOptions: { value: FastingProtocol; label: string; description: string }[] = [
  { value: '16:8', label: '16:8', description: 'Täglich' },
  { value: '24h', label: '24h', description: 'Wöchentlich' },
  { value: 'extended', label: '3-5 Tage', description: 'Quartalsweise' },
];

export const LongevitySettings: React.FC<LongevitySettingsProps> = ({
  rapamycinDay,
  onRapamycinDayChange,
  fastingProtocol,
  onFastingProtocolChange,
  trackDunedinPace,
  onTrackDunedinPaceChange,
  trackSenolytics,
  onTrackSenolyticsChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Dna className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold">Longevity Protocol</h2>
          <span className="text-xs text-purple-400">Phase 3</span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Rapamycin Day */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FlaskConical className="h-4 w-4 text-purple-500" />
              Rapamycin-Tag
            </Label>
            <Select value={rapamycinDay} onValueChange={onRapamycinDayChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wochentag wählen..." />
              </SelectTrigger>
              <SelectContent>
                {weekdays.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Wöchentliche Einnahme – konsistenter Tag empfohlen
            </p>
          </div>

          {/* Fasting Protocol */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-amber-500" />
              Fasten-Protokoll
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {fastingOptions.map((option) => {
                const isSelected = fastingProtocol === option.value;
                return (
                  <div
                    key={option.value}
                    onClick={() => onFastingProtocolChange(option.value)}
                    className={cn(
                      'relative flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    )}
                  >
                    <div className={cn('font-bold text-sm', isSelected && 'text-amber-500')}>
                      {option.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {option.description}
                    </div>
                    {isSelected && (
                      <CheckCircle className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracking Options */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label htmlFor="dunedin-pace" className="flex items-center gap-2 text-sm cursor-pointer">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div>
                  <div>DunedinPACE Tracking</div>
                  <div className="text-xs text-muted-foreground font-normal">Biologische Alterungsrate</div>
                </div>
              </Label>
              <Switch
                id="dunedin-pace"
                checked={trackDunedinPace}
                onCheckedChange={onTrackDunedinPaceChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="senolytics" className="flex items-center gap-2 text-sm cursor-pointer">
                <FlaskConical className="h-4 w-4 text-indigo-500" />
                <div>
                  <div>Senolytic-Zyklen</div>
                  <div className="text-xs text-muted-foreground font-normal">Fisetin/Quercetin tracken</div>
                </div>
              </Label>
              <Switch
                id="senolytics"
                checked={trackSenolytics}
                onCheckedChange={onTrackSenolyticsChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LongevitySettings;
