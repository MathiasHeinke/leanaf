import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, createContext, useContext } from "react";
import { motion, useAnimationControls } from "framer-motion";

/**
 * FireBackdrop – dezentes, animiertes „Lagerfeuer" hinter milchigem Glas.
 *
 * ✅ Dark-UI geeignet (anthrazit)
 * ✅ Sehr dezent im Idle, mit zufälligen „Atemzügen" (alle X Minuten)
 * ✅ Auf Kommando „entzündbar" (Achievement, Action, etc.)
 * ✅ Hinter Glassmorphism/Blur sichtbar (fühlt sich wie hinter Milchglas an)
 * ✅ Keine Images/WebGL nötig – reine CSS/Framer Motion Gradients
 */

export type FireBackdropHandle = {
  /** Produziert einen intensiven Flame-Boost, fällt danach wieder sanft ab. */
  ignite: (opts?: { to?: number; durationMs?: number }) => void;
  /** Manuelle Steuerung der Grundintensität (0–1). */
  setIntensity: (value: number) => void;
};

type FireBackdropProps = {
  /** Startintensität (0 extrem dezent – 1 sehr hell) */
  defaultIntensity?: number;
  /** zufällige Idle-Pulse alle X–Y Millisekunden */
  idleMinMs?: number;
  idleMaxMs?: number;
  /** Entwicklermodus: schnellere Zyklen zum Testen */
  devFastCycle?: boolean;
  /** reduziert Animation (falls du global Reduced Motion respektieren willst) */
  reducedMotion?: boolean;
  className?: string;
};

export const FireBackdrop = forwardRef<FireBackdropHandle, FireBackdropProps>(
  (
    {
      defaultIntensity = 0.18,
      idleMinMs = 5 * 60 * 1000,
      idleMaxMs = 20 * 60 * 1000,
      devFastCycle = false,
      reducedMotion = false,
      className = "",
    },
    ref
  ) => {
    const [intensity, setIntensity] = useState(defaultIntensity);
    // Controls für den Ignite-Burst
    const controls = useAnimationControls();
    const idleTimeout = useRef<number | null>(null);

    // Für Entwicklungszwecke optional schnellere Idle-Pulse
    const [minMs, maxMs] = useMemo(() => {
      if (devFastCycle) return [4000, 9000]; // 4–9s für Vorschau
      return [idleMinMs, idleMaxMs];
    }, [idleMaxMs, idleMinMs, devFastCycle]);

    // Imperative API
    useImperativeHandle(ref, () => ({
      ignite: ({ to = 1, durationMs = 4000 } = {}) => {
        const target = clamp(to, 0, 1);
        // animiere kurzfristig auf „hell lodern", dann zurück zum Idle
        controls.start({
          scale: [1, 1.05 + target * 0.05, 1],
          opacity: [intensity, target, intensity],
          transition: { type: "spring", stiffness: 100, damping: 16, duration: durationMs / 1000 },
        }).then(() => {
          controls.start({ 
            scale: 1, 
            opacity: defaultIntensity, 
            transition: { duration: 1.6 } 
          });
        });
      },
      setIntensity: (value: number) => setIntensity(clamp(value, 0, 1)),
    }));

    // Idle-Pulse: alle 5–20min (oder devFastCycle: 4–9s) atmet das Feuer kurz auf
    useEffect(() => {
      if (reducedMotion) return;
      const schedule = () => {
        const next = rand(minMs, maxMs);
        idleTimeout.current = window.setTimeout(() => {
          const bump = clamp(defaultIntensity + Math.random() * 0.2 + 0.05, 0, 0.65);
          controls.start({ 
            scale: 1 + bump * 0.02, 
            opacity: bump, 
            transition: { duration: 2.2 } 
          }).then(() => {
            controls.start({ 
              scale: 1, 
              opacity: defaultIntensity, 
              transition: { duration: 2.0 } 
            });
            schedule();
          });
        }, next) as unknown as number;
      };
      schedule();
      return () => {
        if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
      };
    }, [controls, defaultIntensity, maxMs, minMs, reducedMotion]);

    // Map Intensity -> pro Layer Eigenschaften
    // i: 0..1 => Helligkeit/Opacity/Scale & Blur
    const vars = useMemo(() => mapIntensityToVars(intensity), [intensity]);

    return (
      <div className={`fixed inset-0 -z-10 pointer-events-none ${className}`} aria-hidden>
        {/* globales CSS nur für dieses Modul */}
        <style>{globalStyles}</style>

        {/* Basis: sehr dunkler Hintergrund, damit die Farben nicht „ausbluten" */}
        <div className="absolute inset-0 bg-neutral-950" />

        {/* Layer 1 – tiefer Rot/Orange-Kern mit leichtem Flicker */}
        <motion.div
          className="absolute inset-0 will-change-transform will-change-filter"
          animate={controls}
          initial={{ scale: 1, opacity: intensity }}
          style={{
            filter: reducedMotion ? undefined : `blur(${vars.blurPx}px) brightness(${vars.brightness})`,
          }}
        >
          <div className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 w-[120vmax] h-[120vmax] animate-fire-flicker">
            {/* radial/verlaufende „Flammen"-Blobs */}
            <div
              className="absolute inset-0 rounded-full opacity-60"
              style={{
                background: radial(
                  "rgba(255,81,0,0.12)",
                  "rgba(255,81,0,0.06)",
                  "rgba(255,0,0,0.0)"
                ),
                transform: `scale(${vars.scaleBase})`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full opacity-50 mix-blend-screen animate-ember-drift"
              style={{
                background: radial(
                  "rgba(255,160,0,0.10)",
                  "rgba(255,200,0,0.06)",
                  "rgba(255,200,0,0.00)"
                ),
                transform: `scale(${vars.scaleMid}) translateY(${vars.liftPx}px)`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full opacity-40 mix-blend-screen"
              style={{
                background: radial(
                  "rgba(255,220,160,0.10)",
                  "rgba(255,230,180,0.06)",
                  "rgba(255,230,180,0.00)"
                ),
                transform: `scale(${vars.scaleTop}) translateY(${vars.liftPx * 1.3}px)`,
              }}
            />
          </div>
        </motion.div>

        {/* Layer 2 – leichter Conic-Glow für „Flammenspiel" */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          animate={controls}
          initial={{ scale: 1, opacity: 0.18 + intensity * 0.25 }}
          style={{
            opacity: 0.18 + intensity * 0.25,
            filter: reducedMotion ? undefined : `blur(${vars.blurPx + 8}px)`,
          }}
        >
          <div className="absolute left-1/2 bottom-[20%] -translate-x-1/2 w-[120vmax] h-[120vmax] animate-conic-sway">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 180deg at 50% 65%, rgba(255,120,0,0.12), rgba(255,60,0,0.06), rgba(255,120,0,0.10), rgba(255,60,0,0.04), rgba(255,120,0,0.12))`,
                transform: `scale(${vars.scaleBase * 0.95})`,
              }}
            />
          </div>
        </motion.div>

        {/* Layer 3 – sanfter Top-Glow, der am Glas streut */}
        <motion.div
          className="absolute inset-0"
          animate={controls}
          initial={{ scale: 1, opacity: 0.08 + intensity * 0.18 }}
          style={{
            opacity: 0.08 + intensity * 0.18,
            filter: reducedMotion ? undefined : `blur(${vars.blurPx + 14}px)`,
          }}
        >
          <div
            className="absolute inset-x-0 top-[10%] h-[40%]"
            style={{
              background: radial(
                "rgba(255,180,120,0.10)",
                "rgba(255,160,100,0.05)",
                "rgba(255,160,100,0.00)"
              ),
            }}
          />
        </motion.div>
      </div>
    );
  }
);

FireBackdrop.displayName = "FireBackdrop";

// ===== Utility: Mapping & Styles =====

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function mapIntensityToVars(i: number) {
  // Feintuning für „realistische" Wärmeentwicklung
  const blurPx = 20 + i * 20; // mehr Hitze => mehr weiche Streuung
  const brightness = 0.9 + i * 0.5;
  const scaleBase = 1 + i * 0.1;
  const scaleMid = 1.05 + i * 0.12;
  const scaleTop = 1.1 + i * 0.12;
  const liftPx = i * 20; // leichtes Aufsteigen
  return { blurPx, brightness, scaleBase, scaleMid, scaleTop, liftPx } as const;
}

function radial(a: string, b: string, c: string) {
  return `radial-gradient(closest-side, ${a} 0%, ${b} 40%, ${c} 70%)`;
}

const globalStyles = `
/* sanfter, unregelmäßiger Flicker */
@keyframes fire-flicker {
  0% { transform: translateY(0) scale(1); opacity: 0.85; }
  25% { transform: translateY(-0.3%) scale(1.005); opacity: 0.9; }
  50% { transform: translateY(0.2%) scale(0.998); opacity: 0.82; }
  75% { transform: translateY(-0.2%) scale(1.004); opacity: 0.88; }
  100% { transform: translateY(0) scale(1); opacity: 0.85; }
}
.animate-fire-flicker { animation: fire-flicker 5.6s ease-in-out infinite; }

/* glimmende Kohlen bewegen sich minimal */
@keyframes ember-drift {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-0.6%) scale(1.01); }
  100% { transform: translateY(0) scale(1); }
}
.animate-ember-drift { animation: ember-drift 9s ease-in-out infinite; }

/* leichtes Drehen für conic-Gradient, ergibt flackernde Kanten */
@keyframes conic-sway {
  0% { transform: rotate(-2deg) scale(1); }
  50% { transform: rotate(2deg) scale(1.01); }
  100% { transform: rotate(-2deg) scale(1); }
}
.animate-conic-sway { animation: conic-sway 14s ease-in-out infinite; }

/* Glass-Pulse Animation */
@keyframes glass-pulse {
  0% { box-shadow: inset 0 0 0 0 rgba(255,200,150,0.0); }
  30% { box-shadow: inset 0 0 60px 8px rgba(255,200,150,0.12); }
  100% { box-shadow: inset 0 0 0 0 rgba(255,200,150,0.0); }
}
.glass-ignite { animation: glass-pulse 1.6s ease-out; }
`;

// ===============================
// Achievement-Hook & EventBus
// ===============================

type FireEvent = string;

type FireBus = {
  emit: (ev: FireEvent) => void;
  on: (ev: FireEvent, cb: () => void) => () => void;
};

// Mini-EventBus (ohne externe Libs)
function createFireEventBus(): FireBus {
  const target = new EventTarget();
  return {
    emit: (ev) => target.dispatchEvent(new CustomEvent(ev)),
    on: (ev, cb) => {
      const handler = () => cb();
      target.addEventListener(ev, handler);
      return () => target.removeEventListener(ev, handler);
    },
  };
}

const FireBusCtx = createContext<FireBus | null>(null);

export function FireBusProvider({ children }: { children: React.ReactNode }) {
  const bus = useMemo(() => createFireEventBus(), []);
  return <FireBusCtx.Provider value={bus}>{children}</FireBusCtx.Provider>;
}

export const useFireBus = () => {
  const ctx = useContext(FireBusCtx);
  if (!ctx) throw new Error("useFireBus must be used inside <FireBusProvider>");
  return ctx;
};

// Mapping: App-Event -> Ignite-Patterns
const defaultFireMap: Record<FireEvent, { to?: number; durationMs?: number }> = {
  "xp:levelup": { to: 0.85, durationMs: 5000 },
  "mission:complete": { to: 0.7, durationMs: 3500 },
  "achievement:unlocked": { to: 0.75, durationMs: 4000 },
  "streak:milestone": { to: 0.6, durationMs: 2500 },
  "points:big_reward": { to: 0.55, durationMs: 2000 },
  "streak:7": { to: 0.7, durationMs: 2200 },
  "streak:30": { to: 1.0, durationMs: 4200 },
};

export function useAchievementFire(
  ref: React.RefObject<FireBackdropHandle>,
  map: Record<FireEvent, { to?: number; durationMs?: number }> = defaultFireMap
) {
  const bus = useFireBus();
  useEffect(() => {
    const disposers = Object.entries(map).map(([ev, cfg]) =>
      bus.on(ev, () => ref.current?.ignite(cfg))
    );
    return () => disposers.forEach((d) => d());
  }, [bus, ref, map]);
}

// Glass-Pulse für Cards bei Fire-Events
export function useGlassIgnitePulse(selector = ".glass-card") {
  const bus = useFireBus();
  useEffect(() => {
    const events = ["xp:levelup", "mission:complete", "achievement:unlocked"];
    const disposers = events.map(ev => bus.on(ev, () => pulse()));
    
    function pulse() {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add("glass-ignite");
        window.setTimeout(() => el.classList.remove("glass-ignite"), 1800);
      });
    }
    
    return () => disposers.forEach(d => d());
  }, [bus, selector]);
}

export default FireBackdrop;