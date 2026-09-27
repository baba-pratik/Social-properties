import React, { useEffect, useState, useCallback, useRef } from "react";
import { BrandMark } from "./BrandMark";

const ENTRY_SEEN_KEY = "social-properties-entry-seen";
const FULL_DURATION = 2800; // time before exit starts (first visit)
const EXIT_DURATION = 600; // exit animation length
const SHORT_DURATION = 1000; // returning visit

interface EntryAnimationProps {
  onComplete: () => void;
}

export const EntryAnimation: React.FC<EntryAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");
  const [isReturning, setIsReturning] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem(ENTRY_SEEN_KEY);
    const returning = seen === "true";
    setIsReturning(returning);

    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    if (returning) {
      // shortened: just enter then exit quickly
      timeoutRef.current = setTimeout(() => {
        setPhase("exit");
        timeoutRef.current = setTimeout(() => {
          localStorage.setItem(ENTRY_SEEN_KEY, "true");
          onComplete();
        }, EXIT_DURATION);
      }, SHORT_DURATION);
      return clearTimer;
    }

    // first visit: enter (phases handled by CSS delays), then exit
    timeoutRef.current = setTimeout(() => {
      setPhase("exit");
      timeoutRef.current = setTimeout(() => {
        localStorage.setItem(ENTRY_SEEN_KEY, "true");
        onComplete();
      }, EXIT_DURATION);
    }, FULL_DURATION);

    return clearTimer;
  }, [prefersReducedMotion, onComplete, clearTimer]);

  if (prefersReducedMotion) return null;

  const containerClass = `
    fixed inset-0 z-[100]
    flex flex-col items-center justify-center
    bg-[var(--color-background)]
    ${phase === "exit" ? "animate-exit" : ""}
    ${phase === "done" ? "opacity-0 pointer-events-none" : "opacity-100"}
  `;

  return (
    <div
      ref={containerRef}
      className={containerClass}
      role="presentation"
      aria-hidden="true"
    >
      <style jsx global>{`
        @keyframes logoReveal {
          0% { opacity: 0; transform: scale(0.92); filter: blur(4px); }
          60% { filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes haloExpand {
          0% { opacity: 0; transform: scale(0.9); }
          30% { opacity: 0.35; transform: scale(1.08); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes exitFadeScale {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.98); }
        }

        .animate-logo-reveal {
          animation: logoReveal 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-halo {
          animation: haloExpand 800ms ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUpFade 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0; /* start hidden */
        }
        .animate-exit {
          animation: exitFadeScale 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .halo-ring {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.18) 0%, rgba(52, 211, 153, 0.08) 40%, transparent 70%);
          pointer-events: none;
        }

        /* entrance delays */
        .delay-brand { animation-delay: 500ms; }
        .delay-brand-hi { animation-delay: 1100ms; }
        .delay-message { animation-delay: 1600ms; }
        .delay-location { animation-delay: 2050ms; }
      `}</style>

      <div className="relative flex flex-col items-center justify-center">
        {/* Logo with halo */}
        <div className="relative z-10 animate-logo-reveal">
          <div className="relative">
            <div className="halo-ring animate-halo" aria-hidden="true" />
            <BrandMark size="entry" showText={false} />
          </div>
        </div>

        {/* Brand title */}
        <div className="mt-6 sm:mt-8 text-center animate-slide-up delay-brand">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--color-text-primary)] leading-tight">
            Social Properties
          </h1>
        </div>
        <div className="mt-2 text-center animate-slide-up delay-brand-hi">
          <p className="text-sm sm:text-base lg:text-lg font-medium text-[var(--color-primary-dark)] leading-relaxed">
            सोशल प्रॉपर्टीज
          </p>
        </div>

        {/* Brand message */}
        <div className="mt-5 sm:mt-6 text-center animate-slide-up delay-message">
          <p className="text-sm sm:text-base lg:text-lg font-normal text-[var(--color-text-secondary)] leading-relaxed max-w-[85vw]">
            आपके शहर की प्रॉपर्टी, आपकी कम्युनिटी
          </p>
        </div>

        {/* Locations */}
        <div className="mt-5 sm:mt-6 text-center animate-slide-up delay-location">
          <p className="text-xs sm:text-sm font-medium text-[var(--color-text-tertiary)] tracking-wider uppercase">
            बोकारो • गिरिडीह
          </p>
        </div>
      </div>
    </div>
  );
};

export default EntryAnimation;