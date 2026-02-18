import { useRef, useCallback, useEffect } from 'react';
import type { FingerResult } from '../types/game';

interface TouchTimerConfig {
  expectedFingerCount: number;
  onAllFingersDown: () => void;
  onFingerLift: (touchId: number, liftTimeMs: number) => void;
  onAllFingersLifted: (results: FingerResult[]) => void;
  onFingerLostDuringCountdown: () => void;
  enabled: boolean;
}

type Phase = 'waiting' | 'allDown' | 'countdown' | 'tracking' | 'done';

const MAX_WAIT_MS = 15000; // 15 second max before auto-recording

export function useTouchTimer(config: TouchTimerConfig) {
  const phaseRef = useRef<Phase>('waiting');
  const activeTouchesRef = useRef<Map<number, boolean>>(new Map()); // touchId -> hasLifted
  const trackingStartRef = useRef<number>(0); // performance.now() when tracking begins
  const resultsRef = useRef<FingerResult[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Call this when the 3-2-1 countdown finishes and "GO" starts */
  const startTracking = useCallback(() => {
    phaseRef.current = 'tracking';
    trackingStartRef.current = performance.now();
    resultsRef.current = [];

    // Safety timeout: auto-finish after MAX_WAIT_MS
    timeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'tracking') {
        // Record remaining fingers with max time
        activeTouchesRef.current.forEach((hasLifted, touchId) => {
          if (!hasLifted) {
            const liftTimeMs = MAX_WAIT_MS;
            resultsRef.current.push({ touchId, liftTimeMs });
            activeTouchesRef.current.set(touchId, true);
            configRef.current.onFingerLift(touchId, liftTimeMs);
          }
        });
        phaseRef.current = 'done';
        configRef.current.onAllFingersLifted(resultsRef.current);
      }
    }, MAX_WAIT_MS);
  }, []);

  const reset = useCallback(() => {
    cleanup();
    phaseRef.current = 'waiting';
    activeTouchesRef.current.clear();
    resultsRef.current = [];
    trackingStartRef.current = 0;
  }, [cleanup]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !config.enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (phaseRef.current === 'done') return;

      // Register new touches
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouchesRef.current.set(touch.identifier, false); // not yet lifted
      }

      // Check if all expected fingers are down
      if (
        phaseRef.current === 'waiting' &&
        activeTouchesRef.current.size >= configRef.current.expectedFingerCount
      ) {
        phaseRef.current = 'allDown';
        configRef.current.onAllFingersDown();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (phaseRef.current === 'done') return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchId = touch.identifier;

        if (phaseRef.current === 'tracking') {
          // Record lift time
          const alreadyLifted = activeTouchesRef.current.get(touchId);
          if (alreadyLifted) continue; // Already recorded

          const liftTimeMs = performance.now() - trackingStartRef.current;
          activeTouchesRef.current.set(touchId, true);
          resultsRef.current.push({ touchId, liftTimeMs });
          configRef.current.onFingerLift(touchId, liftTimeMs);

          // Check if all fingers lifted
          const allLifted = Array.from(activeTouchesRef.current.values()).every(Boolean);
          if (allLifted) {
            cleanup();
            phaseRef.current = 'done';
            configRef.current.onAllFingersLifted(resultsRef.current);
          }
        } else if (phaseRef.current === 'allDown' || phaseRef.current === 'countdown') {
          // Finger lifted during countdown - cancel
          activeTouchesRef.current.delete(touchId);
          phaseRef.current = 'waiting';
          configRef.current.onFingerLostDuringCountdown();
        } else {
          // Waiting phase - just remove the touch
          activeTouchesRef.current.delete(touchId);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling/zooming
    };

    // Gesture blocker (from WaitingGameApp pattern)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('gesturestart', handleGestureStart);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('gesturestart', handleGestureStart);
      cleanup();
    };
  }, [config.enabled, cleanup]);

  return {
    elementRef,
    startTracking,
    reset,
    activeFingerCount: activeTouchesRef.current.size,
  };
}
