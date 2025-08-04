import React, { useRef, useEffect } from 'react';

interface VoiceWaveAnimationProps {
  mediaRecorderRef?: React.RefObject<MediaRecorder | null>;
  isActive?: boolean;
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({ 
  mediaRecorderRef,
  isActive = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!mediaRecorderRef?.current?.stream || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaRecorderRef.current.stream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const draw = () => {
      if (!isActive) return;
      
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    };

    if (isActive) {
      draw();
    }

    return () => {
      audioContext.close();
    };
  }, [mediaRecorderRef, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={80} 
      className="border border-border rounded-lg bg-background"
    />
  );
};