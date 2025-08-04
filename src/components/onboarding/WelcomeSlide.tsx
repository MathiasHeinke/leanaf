import React from 'react';
import { Heart, Sparkles, Zap, Target, TrendingUp } from 'lucide-react';

export const WelcomeSlide = () => {
  return (
    <div className="text-center space-y-8">
      {/* Logo/Icon with Glow Effect */}
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary-glow rounded-full flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow rounded-full blur-lg opacity-50 animate-pulse"></div>
        <Heart className="w-10 h-10 text-white relative z-10" />
      </div>

      {/* Main Title */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Willkommen bei GetLean AI
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-accent animate-pulse" />
          <h2 className="text-lg font-semibold text-foreground">
            Die 6-Pack Engine
          </h2>
          <Zap className="w-5 h-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Mission Statement */}
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Transformiere deinen Körper mit <span className="font-bold text-primary">KI-gesteuerter Präzision</span> und erreiche deine Ziele schneller als je zuvor.
        </p>
        
        {/* Key Promise Icons */}
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
            <Target className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Präzise Ziele</p>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl p-4 border border-accent/20">
            <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium">Messbare Erfolge</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-3 justify-center">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-foreground font-medium text-sm">
              Dein persönlicher AI-Coach wartet bereits auf dich
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};