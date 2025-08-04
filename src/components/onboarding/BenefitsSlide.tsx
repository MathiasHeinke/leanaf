import React from 'react';
import { TrendingDown, Dumbbell, Activity, Zap, CheckCircle, ArrowRight } from 'lucide-react';

// Condensed benefit data structure
const benefits = [
  {
    icon: TrendingDown,
    text: "Schneller Fettabbau",
    detail: "KI-optimierte Ernährung",
    color: "text-green-500"
  },
  {
    icon: Dumbbell,
    text: "Muskelaufbau",
    detail: "Effektive Trainingspläne",
    color: "text-blue-500"
  },
  {
    icon: Activity,
    text: "Personalisiertes Coaching",
    detail: "24/7 AI-Support",
    color: "text-purple-500"
  }
];

// Journey steps
const steps = [
  { number: 1, title: "Profil erstellen", description: "Persönliche Ziele definieren" },
  { number: 2, title: "AI-Analyse", description: "Optimaler Plan wird erstellt" },
  { number: 3, title: "Erfolg messen", description: "Fortschritte verfolgen & feiern" }
];

export const BenefitsSlide = () => {
  return (
    <div className="text-center space-y-8">
      {/* Title Section */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          So funktioniert's
        </h1>
        <p className="text-muted-foreground">
          Dein Weg zum Erfolg in 3 Schritten
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
        {benefits.map((benefit, index) => {
          const IconComponent = benefit.icon;
          return (
            <div 
              key={index}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-background to-muted/30 rounded-xl border border-primary/10 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex-shrink-0">
                <IconComponent className={`w-6 h-6 ${benefit.color}`} />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{benefit.text}</p>
                  <p className="text-xs text-muted-foreground">{benefit.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Journey Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Deine Transformation beginnt jetzt
        </h3>
        
        <div className="space-y-3 max-w-xs mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step.number}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA with Energy */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center gap-3 justify-center">
          <Zap className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-foreground font-medium text-sm">
            Starte jetzt deine persönliche Transformation
          </span>
        </div>
      </div>
    </div>
  );
};