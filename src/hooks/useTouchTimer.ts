import { useRef, useCallback, useEffect } from 'react';
import type { FingerResult } from '../types/game';

interface TouchTimerConfig {
  expectedFingerCount: number;
  onAllFingersDown: () => void;
  onFingerLift: (touchId: number, liftTimeMs: number) => void;
  onAllFingersLifted: (results: FingerResult[]) => void;
  onFingerLostDuringCountdown: () => void;
  /** Called whenever a button position changes (for re-render) */
  onPositionChange: () => void;
  enabled: boolean;
}

type Phase = 'waiting' | 'allDown' | 'countdown' | 'tracking' | 'done';

const MAX_WAIT_MS = 15000;
const BUTTON_SIZE = 110;
const EDGE_INSET = 24; // px from edge

export interface ButtonPosition {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

/**
 * Per-player button touch timer with drag support.
 * Replicates TheWaitingGame's event model:
 * - Buttons are absolutely positioned and draggable via pointermove
 * - setPointerCapture tracks movement outside button bounds
 * - Default layout arranges buttons in a circle around container edges
 * - When all held → countdown. After GO → tracking lift times.
 * - Buttons persist through all phases (no UI swap).
 */
export function useTouchTimer(config: TouchTimerConfig) {
  const phaseRef = useRef<Phase>('waiting');
  const heldButtonsRef = useRef<Set<number>>(new Set());
  const pointerMapRef = useRef<Map<number, number>>(new Map()); // pointerId → playerIndex
  const trackingStartRef = useRef<number>(0);
  const resultsRef = useRef<FingerResult[]>([]);
  const liftedButtonsRef = useRef<Set<number>>(new Set());
  const timeoutRef = useRef<number | null>(null);

  // Draggable positions: playerIndex → normalized {x, y}
  const positionsRef = useRef<Map<number, ButtonPosition>>(new Map());
  // Reference to the container element for coordinate conversion
  const containerRef = useRef<HTMLDivElement | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Initialize default circular layout positions */
  const initPositions = useCallback((count: number) => {
    const map = new Map<number, ButtonPosition>();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2; // start at top
      // Place near edges: radius = 0.35 of container (leaving room for button size)
      const radius = 0.35;
      map.set(i, {
        x: 0.5 + radius * Math.cos(angle),
        y: 0.5 + radius * Math.sin(angle),
      });
    }
    positionsRef.current = map;
  }, []);

  /** Convert client coords to normalized container coords (matching TheWaitingGame) */
  const clientToNormalized = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0.5, y: 0.5 };
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const halfBtn = BUTTON_SIZE / 2;
    const minX = halfBtn + EDGE_INSET;
    const maxX = rect.width - halfBtn - EDGE_INSET;
    const minY = halfBtn + EDGE_INSET;
    const maxY = rect.height - halfBtn - EDGE_INSET;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));
    return {
      x: rect.width > 0 ? clampedX / rect.width : 0.5,
      y: rect.height > 0 ? clampedY / rect.height : 0.5,
    };
  }, []);

  /** Get pixel position from normalized coords */
  const getPixelPosition = useCallback((pos: ButtonPosition): { left: number; top: number } => {
    const container = containerRef.current;
    if (!container) return { left: 0, top: 0 };
    const rect = container.getBoundingClientRect();
    return {
      left: rect.width * pos.x,
      top: rect.height * pos.y,
    };
  }, []);

  /** Called when 3-2-1 countdown finishes */
  const startTracking = useCallback(() => {
    phaseRef.current = 'tracking';
    trackingStartRef.current = performance.now();
    resultsRef.current = [];
    liftedButtonsRef.current.clear();

    timeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'tracking') {
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

      // Update position to where finger touched (like TheWaitingGame)
      const normalized = clientToNormalized(e.clientX, e.clientY);
      positionsRef.current.set(playerIndex, normalized);
      configRef.current.onPositionChange();

      // Check if all held
      if (
        phaseRef.current === 'waiting' &&
        heldButtonsRef.current.size >= configRef.current.expectedFingerCount
      ) {
        phaseRef.current = 'allDown';
        configRef.current.onAllFingersDown();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const mappedIndex = pointerMapRef.current.get(e.pointerId);
      if (mappedIndex === undefined) return;
      if (!heldButtonsRef.current.has(mappedIndex)) return;
      if (e.cancelable) e.preventDefault();

      // Drag: update position during waiting/countdown phases
      // During tracking, buttons stay frozen (matching TheWaitingGame)
      if (phaseRef.current !== 'tracking' && phaseRef.current !== 'done') {
        const normalized = clientToNormalized(e.clientX, e.clientY);
        positionsRef.current.set(mappedIndex, normalized);
        configRef.current.onPositionChange();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      const mappedIndex = pointerMapRef.current.get(e.pointerId);
      if (mappedIndex === undefined) return;

      pointerMapRef.current.delete(e.pointerId);

      if (phaseRef.current === 'tracking') {
        if (!liftedButtonsRef.current.has(mappedIndex)) {
          liftedButtonsRef.current.add(mappedIndex);
          const liftTimeMs = performance.now() - trackingStartRef.current;
          resultsRef.current.push({ touchId: mappedIndex, liftTimeMs });
          configRef.current.onFingerLift(mappedIndex, liftTimeMs);
          heldButtonsRef.current.delete(mappedIndex);

          if (liftedButtonsRef.current.size >= configRef.current.expectedFingerCount) {
            cleanup();
            phaseRef.current = 'done';
            configRef.current.onAllFingersLifted(resultsRef.current);
          }
        }
      } else if (phaseRef.current === 'allDown' || phaseRef.current === 'countdown') {
        heldButtonsRef.current.delete(mappedIndex);
        phaseRef.current = 'waiting';
        configRef.current.onFingerLostDuringCountdown();
      } else {
        heldButtonsRef.current.delete(mappedIndex);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      onPointerUp(e);
    };

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
  }, [cleanup, clientToNormalized]);

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
    initPositions,
    positionsRef,
    getPixelPosition,
    containerRef,
    heldButtonsRef,
    liftedButtonsRef,
    phaseRef,
  };
}
