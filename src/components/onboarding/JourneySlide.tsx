import React from 'react';
import { Target, Calculator, Activity } from 'lucide-react';

export const JourneySlide = () => {
  return (
    <div className="text-center space-y-8">
      {/* Title */}
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">
          In 3 Schritten zur Transformation
        </h2>
        <p className="text-white/60">
          So einfach startest du durch
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6 max-w-md mx-auto">
        <div className="flex items-start gap-4 text-left">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/30">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white">1. Gib deine Basisdaten ein</h3>
            <p className="text-white/60 text-sm">
              Gewicht, Größe, Ziel und Aktivitätslevel – das reicht schon
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-accent/30">
            <Calculator className="w-6 h-6 text-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white">2. Die Engine berechnet deinen Plan</h3>
            <p className="text-white/60 text-sm">
              Automatische Kalorien- und Nährstoffziele basierend auf deinen Daten
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-500/30">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white">3. Du startest sofort mit dem Tracking</h3>
            <p className="text-white/60 text-sm">
              Mahlzeiten fotografieren, Gewicht tracken – ganz easy und effektiv
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 max-w-md mx-auto">
        <p className="text-white/70 text-sm italic">
          Keine Sorge: Alle Daten kannst du später jederzeit ändern.
        </p>
      </div>
    </div>
  );
};