import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Battery, Zap, Check, Pill } from "lucide-react";
import { NADProtocol, useNADTracking } from "@/hooks/useNADTracking";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface NADProtocolCardProps {
  protocol: NADProtocol;
  onLogged: () => void;
}

const SUPPLEMENT_INFO: Record<string, { name: string; description: string; color: string }> = {
  'nmn': {
    name: 'NMN',
    description: 'Nicotinamid-Mononukleotid',
    color: 'bg-orange-500',
  },
  'nr': {
    name: 'NR',
    description: 'Nicotinamid-Ribosid',
    color: 'bg-purple-500',
  },
  'nad_iv': {
    name: 'NAD+ IV',
    description: 'Intravenöse Infusion',
    color: 'bg-blue-500',
  },
  'nad_patch': {
    name: 'NAD+ Patch',
    description: 'Transdermales Pflaster',
    color: 'bg-green-500',
  },
};

const FORMULATION_LABELS: Record<string, string> = {
  'capsule': 'Kapsel',
  'sublingual': 'Sublingual',
  'liposomal': 'Liposomal',
  'powder': 'Pulver',
};

export function NADProtocolCard({ protocol, onLogged }: NADProtocolCardProps) {
  const { logIntake } = useNADTracking();
  const [isLogging, setIsLogging] = useState(false);

  const info = SUPPLEMENT_INFO[protocol.supplement_type] || {
    name: protocol.supplement_type.toUpperCase(),
    description: 'NAD+ Booster',
    color: 'bg-gray-500',
  };

  const handleQuickLog = async () => {
    setIsLogging(true);
    try {
      await logIntake();
      onLogged();
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${info.color}`} />
            <CardTitle className="text-lg">{info.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            <Battery className="h-3 w-3 mr-1" />
            Täglich
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Dosierung */}
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-orange-600" />
          <div>
            <span className="text-2xl font-bold text-orange-700">{protocol.dose_mg}</span>
            <span className="text-sm text-muted-foreground ml-1">mg</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {FORMULATION_LABELS[protocol.formulation] || protocol.formulation}
            {protocol.with_resveratrol && ` + ${protocol.resveratrol_dose_mg}mg Resveratrol`}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Timing</span>
            <p className="font-medium">
              {protocol.timing === 'morning_fasted' ? 'Morgens nüchtern' : protocol.timing}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Seit</span>
            <p className="font-medium">
              {format(new Date(protocol.started_at), 'dd. MMM', { locale: de })}
            </p>
          </div>
        </div>

        {/* Resveratrol Info */}
        {protocol.with_resveratrol && (
          <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-700">
              <Zap className="h-3 w-3 inline mr-1" />
              + Resveratrol: Aktiviert Sirtuine synergistisch mit NAD+
            </p>
          </div>
        )}

        {/* Quick Log Button */}
        <Button 
          onClick={handleQuickLog} 
          disabled={isLogging}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isLogging ? "Speichere..." : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Heute genommen
            </>
          )}
        </Button>

        {/* Brand if set */}
        {protocol.brand && (
          <p className="text-xs text-center text-muted-foreground">
            Marke: {protocol.brand}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
