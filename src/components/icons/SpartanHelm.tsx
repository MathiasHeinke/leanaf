/**
 * SpartanHelm - Custom SVG Icon for ARES
 * Premium gold gradient Corinthian helmet design
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SpartanHelmProps {
  className?: string;
  animated?: boolean;
}

export const SpartanHelm: React.FC<SpartanHelmProps> = ({ 
  className = "w-10 h-10",
  animated = true
}) => (
  <svg 
    viewBox="0 0 64 64" 
    className={cn("fill-none", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Primary Gold Gradient */}
      <linearGradient id="helmGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F6E27A" />
        <stop offset="35%" stopColor="#D4AF37" />
        <stop offset="65%" stopColor="#C5A028" />
        <stop offset="100%" stopColor="#AA8C2C" />
      </linearGradient>
      
      {/* Shimmer Gradient with Animation */}
      <linearGradient id="helmShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F6E27A">
          {animated && (
            <animate 
              attributeName="stopColor" 
              values="#F6E27A;#FFF8DC;#F6E27A" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          )}
        </stop>
        <stop offset="50%" stopColor="#D4AF37">
          {animated && (
            <animate 
              attributeName="stopColor" 
              values="#D4AF37;#F6E27A;#D4AF37" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          )}
        </stop>
        <stop offset="100%" stopColor="#AA8C2C">
          {animated && (
            <animate 
              attributeName="stopColor" 
              values="#AA8C2C;#D4AF37;#AA8C2C" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          )}
        </stop>
      </linearGradient>
      
      {/* Highlight for 3D effect */}
      <linearGradient id="helmHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF8DC" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </linearGradient>
    </defs>
    
    {/* Main Helmet Dome */}
    <path 
      d="M32 6C20 6 12 14 10 24C9 30 9 36 10 42C11 46 14 50 18 52L18 40C18 38 20 36 22 35L32 30L42 35C44 36 46 38 46 40L46 52C50 50 53 46 54 42C55 36 55 30 54 24C52 14 44 6 32 6Z"
      fill="url(#helmGold)"
    />
    
    {/* Helmet Crest (Plume base) */}
    <path 
      d="M32 4C30 4 28 5 28 8L28 12C28 14 30 16 32 16C34 16 36 14 36 12L36 8C36 5 34 4 32 4Z"
      fill="url(#helmShimmer)"
    />
    
    {/* Crest Ridge */}
    <path 
      d="M30 8L30 24L32 26L34 24L34 8C34 6 33 5 32 5C31 5 30 6 30 8Z"
      fill="url(#helmGold)"
    />
    
    {/* Face Opening - T-Shape */}
    <path 
      d="M24 28L24 44C24 48 27 52 32 52C37 52 40 48 40 44L40 28L32 24L24 28Z"
      fill="#0a0a0a"
      opacity="0.95"
    />
    
    {/* Left Cheek Guard */}
    <path 
      d="M10 42C10 46 12 50 16 52L18 52L18 38L14 40C12 41 10 41 10 42Z"
      fill="url(#helmGold)"
    />
    
    {/* Right Cheek Guard */}
    <path 
      d="M54 42C54 46 52 50 48 52L46 52L46 38L50 40C52 41 54 41 54 42Z"
      fill="url(#helmGold)"
    />
    
    {/* Nose Guard */}
    <path 
      d="M30 28L30 38L32 40L34 38L34 28L32 26L30 28Z"
      fill="url(#helmShimmer)"
    />
    
    {/* Highlight overlay for 3D metallic effect */}
    <path 
      d="M32 6C20 6 12 14 10 24C9 28 9 32 10 36C20 34 28 28 32 20C36 28 44 34 54 36C55 32 55 28 54 24C52 14 44 6 32 6Z"
      fill="url(#helmHighlight)"
    />
    
    {/* Brow ridge detail */}
    <path 
      d="M18 26C22 24 27 23 32 24C37 23 42 24 46 26C47 27 46 28 45 28C41 26 36 25 32 26C28 25 23 26 19 28C18 28 17 27 18 26Z"
      fill="#AA8C2C"
      opacity="0.6"
    />
  </svg>
);

export default SpartanHelm;
