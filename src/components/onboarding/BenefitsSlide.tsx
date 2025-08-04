import React from 'react';
import { CheckCircle, TrendingDown, Dumbbell, Activity, Moon } from 'lucide-react';

export const BenefitsSlide = () => {
  const benefits = [
    {
      icon: <TrendingDown className="w-5 h-5" />,
      text: "10kg Fett verlieren",
      color: "text-green-500"
    },
    {
      icon: <Dumbbell className="w-5 h-5" />,
      text: "Muskeldefinition aufbauen",
      color: "text-blue-500"
    },
    {
      icon: <Activity className="w-5 h-5" />,
      text: "Tägliche Motivation & Fortschritt",
      color: "text-purple-500"
    },
    {
      icon: <Moon className="w-5 h-5" />,
      text: "Alles tracken – Ernährung, Schlaf, Maße, Supplements",
      color: "text-indigo-500"
    }
  ];

  return (
    <div className="text-center space-y-8">
      {/* Title */}
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">
          Was du mit GetLean AI erreichst
        </h2>
        <p className="text-white/60">
          Echte Ergebnisse für echte Menschen
        </p>
      </div>

      {/* Benefits List */}
      <div className="space-y-4 max-w-md mx-auto">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="flex items-center gap-4 text-left bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className={`${benefit.color} flex-shrink-0`}>
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className={`${benefit.color} flex-shrink-0`}>
              {benefit.icon}
            </div>
            <span className="text-white font-medium">
              {benefit.text}
            </span>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm rounded-xl p-6 border border-primary/20 max-w-md mx-auto">
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-white">
            Dein Körper. Deine Daten. Dein Weg.
          </h3>
          <p className="text-white/70">
            Du hast die volle Kontrolle über deine Transformation.
          </p>
        </div>
      </div>
    </div>
  );
};