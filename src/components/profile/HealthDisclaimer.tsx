import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scale, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthDisclaimerProps {
  isAccepted: boolean;
  acceptedAt: string | null;
  onAccept: () => void;
}

export function HealthDisclaimer({ isAccepted, acceptedAt, onAccept }: HealthDisclaimerProps) {
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const allChecked = check1 && check2 && check3;
  const canAccept = allChecked && !isAccepted;

  // Reset checkboxes if already accepted
  useEffect(() => {
    if (isAccepted) {
      setCheck1(true);
      setCheck2(true);
      setCheck3(true);
    }
  }, [isAccepted]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold">Rechtlicher Hinweis</h2>
          <p className="text-sm text-muted-foreground">Bitte lesen und bestätigen</p>
        </div>
        {isAccepted && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
      </div>

      <Card className={cn(
        "border-2 transition-colors",
        isAccepted ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30"
      )}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Shield className={cn(
              "h-6 w-6 flex-shrink-0",
              isAccepted ? "text-green-500" : "text-amber-500"
            )} />
            <div>
              <CardTitle className="text-lg">Haftungsausschluss & Verantwortung</CardTitle>
              <CardDescription>
                Wichtige Informationen zur Nutzung dieser App
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Disclaimer Text */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Diese App dient <strong className="text-foreground">ausschließlich der Unterhaltung, 
              Dokumentation und dem persönlichen Logging</strong>. Sie stellt keine medizinische 
              Beratung, Diagnose oder Behandlungsempfehlung dar.
            </p>
            <p>
              Die bereitgestellten Informationen ersetzen <strong className="text-foreground">KEINEN Arztbesuch</strong> 
              {" "}und keine professionelle medizinische Beratung. Bei gesundheitlichen Problemen, 
              Beschwerden oder vor der Einnahme von Nahrungsergänzungsmitteln, Medikamenten oder 
              Hormonen muss IMMER ein qualifizierter Arzt konsultiert werden.
            </p>
            <p>
              Die Nutzung dieser App erfolgt auf eigene Verantwortung. Der Betreiber übernimmt 
              keine Haftung für gesundheitliche Schäden, die durch die Nutzung der App oder 
              Umsetzung von Informationen entstehen könnten.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="disclaimer-1"
                checked={check1}
                onCheckedChange={(c) => !isAccepted && setCheck1(!!c)}
                disabled={isAccepted}
              />
              <Label htmlFor="disclaimer-1" className={cn(
                "text-sm cursor-pointer leading-relaxed",
                isAccepted && "cursor-default"
              )}>
                Ich bestätige, dass ich für meine Gesundheit selbst verantwortlich bin und 
                diese App nur zur Dokumentation und Unterhaltung nutze.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="disclaimer-2"
                checked={check2}
                onCheckedChange={(c) => !isAccepted && setCheck2(!!c)}
                disabled={isAccepted}
              />
              <Label htmlFor="disclaimer-2" className={cn(
                "text-sm cursor-pointer leading-relaxed",
                isAccepted && "cursor-default"
              )}>
                Ich verstehe, dass diese App keine medizinische Beratung darstellt und 
                bei gesundheitlichen Fragen immer ein Arzt konsultiert werden muss.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="disclaimer-3"
                checked={check3}
                onCheckedChange={(c) => !isAccepted && setCheck3(!!c)}
                disabled={isAccepted}
              />
              <Label htmlFor="disclaimer-3" className={cn(
                "text-sm cursor-pointer leading-relaxed",
                isAccepted && "cursor-default"
              )}>
                Ich akzeptiere, dass die Nutzung auf eigene Gefahr erfolgt und der Betreiber 
                keine Haftung für etwaige Schäden übernimmt.
              </Label>
            </div>
          </div>

          {/* Accept Button or Status */}
          {isAccepted ? (
            <div className="flex items-center gap-2 pt-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Akzeptiert am {acceptedAt ? new Date(acceptedAt).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'unbekannt'}
              </span>
            </div>
          ) : (
            <Button
              onClick={onAccept}
              disabled={!canAccept}
              className="w-full"
            >
              {allChecked ? 'Disclaimer akzeptieren' : 'Bitte alle Punkte bestätigen'}
            </Button>
          )}

          {/* Warning if not all checked */}
          {!isAccepted && !allChecked && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Alle Punkte müssen bestätigt werden, um fortzufahren</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
