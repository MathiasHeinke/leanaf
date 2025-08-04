import React from 'react';
import { Heart, Sparkles, Zap } from 'lucide-react';

export const WelcomeSlide = () => {
  return (
    <div className="text-center space-y-6">
      {/* Logo/Icon with Glow Effect */}
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary via-accent to-primary/60 rounded-full flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary/60 rounded-full blur-lg opacity-50 animate-pulse"></div>
        <Heart className="w-12 h-12 text-white relative z-10" />
      </div>

      {/* Main Title */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Willkommen bei GetLean AI
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-accent animate-pulse" />
          <h2 className="text-xl font-semibold text-white/90">
            Die 6-Pack Engine
          </h2>
          <Zap className="w-5 h-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 max-w-lg mx-auto">
        <p className="text-lg text-white/80 leading-relaxed">
          Diese App hilft dir, <span className="font-bold text-primary">schnell und nachhaltig</span> Fett zu verlieren, Muskeln aufzubauen und ein gesünderes Leben zu starten.
        </p>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3 justify-center">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            <span className="text-white font-medium">
              Du spielst hier nur gegen dich selbst – und wirst jeden Tag ein Stück besser.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};