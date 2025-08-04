import React, { useRef, useEffect } from 'react';

interface VoiceCanvasWaveformProps {
  audioLevel?: number;
  isActive?: boolean;
  width?: number;
  height?: number;
}

export const VoiceCanvasWaveform: React.FC<VoiceCanvasWaveformProps> = ({
  audioLevel = 0,
  isActive = true,
  width = 120,
  height = 40
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas dimensions for crisp rendering
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw static bars when not active
        const barCount = 5;
        const barWidth = 3;
        const spacing = 4;
        const totalWidth = barCount * barWidth + (barCount - 1) * spacing;
        const startX = (width - totalWidth) / 2;

        ctx.fillStyle = 'rgba(255, 59, 48, 0.4)'; // #FF3B30 with low opacity
        
        for (let i = 0; i < barCount; i++) {
          const x = startX + i * (barWidth + spacing);
          const y = height / 2 - 4;
          ctx.fillRect(x, y, barWidth, 8);
        }
        return;
      }

      // Animate bars when active
      const barCount = 5;
      const barWidth = 3;
      const spacing = 4;
      const totalWidth = barCount * barWidth + (barCount - 1) * spacing;
      const startX = (width - totalWidth) / 2;
      const centerY = height / 2;

      // Update phase for animation
      phaseRef.current += 0.15;

      ctx.fillStyle = '#FF3B30'; // iOS alert red

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + spacing);
        
        // Create wave effect with audio level influence
        const baseAmplitude = 8;
        const maxAmplitude = 32;
        const audioInfluence = audioLevel * 20;
        const waveOffset = Math.sin(phaseRef.current + i * 0.5) * (baseAmplitude + audioInfluence);
        const randomness = Math.sin(phaseRef.current * 2 + i * 1.2) * 4;
        
        const barHeight = Math.max(baseAmplitude, Math.abs(waveOffset) + randomness);
        const clampedHeight = Math.min(barHeight, maxAmplitude);
        
        const y = centerY - clampedHeight / 2;
        
        // Add subtle glow effect
        ctx.shadowColor = '#FF3B30';
        ctx.shadowBlur = 4;
        ctx.fillRect(x, y, barWidth, clampedHeight);
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isActive) {
      animate();
    } else {
      animate(); // Draw static state once
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isActive, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ width, height }}
    />
  );
};