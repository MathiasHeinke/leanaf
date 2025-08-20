import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export interface FireBackdropHandle {
  ignite: (options?: { to?: number; durationMs?: number }) => void;
  setIntensity: (intensity: number) => void;
}

interface FireBackdropProps {
  chatMode?: boolean; // Dimmed for chat
  devFastCycle?: boolean; // Fast cycle for testing
  className?: string;
}

const FireBackdrop = forwardRef<FireBackdropHandle, FireBackdropProps>(
  ({ chatMode = false, devFastCycle = false, className = "" }, ref) => {
    const [intensity, setIntensity] = useState(chatMode ? 0.3 : 0.5);
    const controls = useAnimation();
    const breathingControls = useAnimation();
    
    // Breathing effect - subtle idle animation
    useEffect(() => {
      const startBreathing = async () => {
        await breathingControls.start({
          scale: [1, 1.02, 1],
          opacity: [intensity, intensity * 1.1, intensity],
          transition: {
            duration: devFastCycle ? 2 : 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1]
          }
        });
      };
      
      startBreathing();
    }, [intensity, breathingControls, devFastCycle]);

    // Random pulse effect
    useEffect(() => {
      const randomPulse = () => {
        const randomDelay = devFastCycle 
          ? Math.random() * 10000 + 5000 // 5-15s for testing
          : Math.random() * 900000 + 300000; // 5-20min for production
        
        setTimeout(() => {
          controls.start({
            scale: [1, 1.05, 1],
            opacity: [intensity, intensity * 1.3, intensity],
            transition: { duration: 3, ease: "easeInOut" }
          }).then(() => randomPulse());
        }, randomDelay);
      };
      
      randomPulse();
    }, [intensity, controls, devFastCycle]);

    useImperativeHandle(ref, () => ({
      ignite: ({ to = 0.8, durationMs = 4000 } = {}) => {
        controls.start({
          scale: [1, 1.1, 1.05, 1],
          opacity: [intensity, to, to * 0.9, intensity],
          transition: { 
            duration: durationMs / 1000,
            ease: "easeOut",
            times: [0, 0.3, 0.7, 1]
          }
        });
      },
      setIntensity: (newIntensity: number) => {
        setIntensity(newIntensity);
      }
    }));

    const baseIntensity = chatMode ? 0.4 : 0.6;
    const fireGradient = `
      radial-gradient(ellipse 80% 50% at 50% 90%, 
        hsla(25, 100%, 50%, ${baseIntensity * 0.8}) 0%,
        hsla(15, 90%, 45%, ${baseIntensity * 0.6}) 25%,
        hsla(5, 80%, 40%, ${baseIntensity * 0.4}) 50%,
        hsla(0, 70%, 20%, ${baseIntensity * 0.2}) 75%,
        transparent 100%
      ),
      radial-gradient(ellipse 60% 40% at 30% 85%,
        hsla(35, 95%, 55%, ${baseIntensity * 0.6}) 0%,
        hsla(20, 85%, 50%, ${baseIntensity * 0.4}) 40%,
        transparent 70%
      ),
      radial-gradient(ellipse 70% 45% at 70% 80%,
        hsla(40, 90%, 60%, ${baseIntensity * 0.5}) 0%,
        hsla(25, 80%, 45%, ${baseIntensity * 0.3}) 50%,
        transparent 80%
      )
    `;

    return (
      <motion.div
        animate={controls}
        className={`fixed inset-0 -z-10 ${className}`}
        style={{
          background: fireGradient,
          filter: 'blur(2px)',
        }}
      >
        <motion.div
          animate={breathingControls}
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 100% 60% at 50% 100%,
                hsla(45, 100%, 65%, ${baseIntensity * 0.3}) 0%,
                hsla(30, 90%, 55%, ${baseIntensity * 0.2}) 30%,
                transparent 60%
              )
            `,
            filter: 'blur(3px)',
          }}
        />
        
        {/* Ember particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(chatMode ? 3 : 5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: `hsla(${25 + i * 10}, 90%, 60%, ${baseIntensity * 0.6})`,
                left: `${30 + i * 15}%`,
                bottom: '20%',
              }}
              animate={{
                y: [-10, -40, -20],
                x: [0, Math.sin(i) * 20, Math.cos(i) * 15],
                opacity: [0, baseIntensity * 0.8, 0],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: devFastCycle ? 3 : 8,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }
);

FireBackdrop.displayName = 'FireBackdrop';

export default FireBackdrop;