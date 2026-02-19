import { useRef, useCallback, useEffect } from 'react';
import type { FingerResult } from '../types/game';

interface TouchTimerConfig {
  /** Number of player buttons expected */
  expectedFingerCount: number;
  onAllFingersDown: () => void;
  onFingerLift: (touchId: number, liftTimeMs: number) => void;
  onAllFingersLifted: (results: FingerResult[]) => void;
  onFingerLostDuringCountdown: () => void;
  enabled: boolean;
}

type Phase = 'waiting' | 'allDown' | 'countdown' | 'tracking' | 'done';

const MAX_WAIT_MS = 15000; // 15 second max before auto-recording

/**
 * Per-player button touch timer.
 * Each player has a dedicated button. The hook tracks which buttons
 * are held using a set of player indices. When all are held → countdown.
 * After countdown → tracking phase where lift times are recorded.
 *
 * Unlike the old version (single div with raw touch events), this uses
 * pointer events per button with setPointerCapture, matching TheWaitingGame.
 */
export function useTouchTimer(config: TouchTimerConfig) {
  const phaseRef = useRef<Phase>('waiting');
  const heldButtonsRef = useRef<Set<number>>(new Set()); // set of player indices currently held
  const pointerMapRef = useRef<Map<number, number>>(new Map()); // pointerId -> playerIndex
  const trackingStartRef = useRef<number>(0);
  const resultsRef = useRef<FingerResult[]>([]);
  const liftedButtonsRef = useRef<Set<number>>(new Set()); // player indices that have lifted during tracking
  const timeoutRef = useRef<number | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Called when the 3-2-1 countdown finishes and "GO" starts */
  const startTracking = useCallback(() => {
    phaseRef.current = 'tracking';
    trackingStartRef.current = performance.now();
    resultsRef.current = [];
    liftedButtonsRef.current.clear();

    // Safety timeout: auto-finish after MAX_WAIT_MS
    timeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'tracking') {
        // Record remaining held buttons with max time
        heldButtonsRef.current.forEach((playerIdx) => {
          if (!liftedButtonsRef.current.has(playerIdx)) {
            liftedButtonsRef.current.add(playerIdx);
            resultsRef.current.push({ touchId: playerIdx, liftTimeMs: MAX_WAIT_MS });
            configRef.current.onFingerLift(playerIdx, MAX_WAIT_MS);
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
    heldButtonsRef.current.clear();
    pointerMapRef.current.clear();
    liftedButtonsRef.current.clear();
    resultsRef.current = [];
    trackingStartRef.current = 0;
  }, [cleanup]);

  /** Create pointer event handlers for a specific player button */
  const createButtonHandlers = useCallback((playerIndex: number) => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      if (phaseRef.current === 'done') return;

      const btn = e.currentTarget as HTMLElement;
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

      pointerMapRef.current.set(e.pointerId, playerIndex);
      heldButtonsRef.current.add(playerIndex);

      // Check if all expected buttons are held
      if (
        phaseRef.current === 'waiting' &&
        heldButtonsRef.current.size >= configRef.current.expectedFingerCount
      ) {
        phaseRef.current = 'allDown';
        configRef.current.onAllFingersDown();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      const mappedIndex = pointerMapRef.current.get(e.pointerId);
      if (mappedIndex === undefined) return;

      pointerMapRef.current.delete(e.pointerId);

      if (phaseRef.current === 'tracking') {
        // Record lift time
        if (!liftedButtonsRef.current.has(mappedIndex)) {
          liftedButtonsRef.current.add(mappedIndex);
          const liftTimeMs = performance.now() - trackingStartRef.current;
          resultsRef.current.push({ touchId: mappedIndex, liftTimeMs });
          configRef.current.onFingerLift(mappedIndex, liftTimeMs);

          heldButtonsRef.current.delete(mappedIndex);

          // Check if all fingers lifted
          if (liftedButtonsRef.current.size >= configRef.current.expectedFingerCount) {
            cleanup();
            phaseRef.current = 'done';
            configRef.current.onAllFingersLifted(resultsRef.current);
          }
        }
      } else if (phaseRef.current === 'allDown' || phaseRef.current === 'countdown') {
        // Finger lifted during countdown — cancel
        heldButtonsRef.current.delete(mappedIndex);
        phaseRef.current = 'waiting';
        configRef.current.onFingerLostDuringCountdown();
      } else {
        // Waiting phase
        heldButtonsRef.current.delete(mappedIndex);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      // Treat cancel same as pointer up
      onPointerUp(e);
    };

    return { onPointerDown, onPointerUp, onPointerCancel };
  }, [cleanup]);

  // Clean up on unmount / disable
  useEffect(() => {
    if (!config.enabled) {
      reset();
    }
    return () => { cleanup(); };
  }, [config.enabled, cleanup, reset]);

  return {
    startTracking,
    reset,
    createButtonHandlers,
    heldButtonsRef,
    liftedButtonsRef,
    phaseRef,
  };
}
