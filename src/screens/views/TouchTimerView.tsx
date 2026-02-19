import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../../state/gameContext';
import { useTouchTimer } from '../../hooks/useTouchTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { CountdownOverlay } from '../../components/ui/CountdownOverlay';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';
import type { FingerResult } from '../../types/game';

const BUTTON_SIZE = 110;

export function TouchTimerView() {
  const { state, dispatch } = useGame();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [message, setMessage] = useState('');
  const [, forceRender] = useState(0);

  const expectedCount = state.expectedFingerCount;

  // Guessing players (everyone except the active player)
  const guessingPlayers = useMemo(
    () => state.players.filter((_, i) => i !== state.activePlayerIndex),
    [state.players, state.activePlayerIndex]
  );

  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

  const handleAllFingersDown = useCallback(() => {
    setShowCountdown(true);
    dispatch({ type: 'START_COUNTDOWN', startTime: performance.now() });
  }, [dispatch]);

  const handleFingerLift = useCallback((_touchId: number, _liftTimeMs: number) => {
    forceRender((n) => n + 1);
  }, []);

  const handleAllFingersLifted = useCallback((results: FingerResult[]) => {
    setIsTracking(false);
    dispatch({ type: 'ALL_FINGERS_LIFTED', results });
  }, [dispatch]);

  const handleFingerLostDuringCountdown = useCallback(() => {
    setShowCountdown(false);
    setMessage('Someone let go! Everyone hold your buttons.');
    dispatch({ type: 'CANCEL_COUNTDOWN' });
    forceRender((n) => n + 1);
    setTimeout(() => setMessage(''), 3000);
  }, [dispatch]);

  const handlePositionChange = useCallback(() => {
    forceRender((n) => n + 1);
  }, []);

  const {
    startTracking,
    createButtonHandlers,
    initPositions,
    positionsRef,
    getPixelPosition,
    containerRef,
    heldButtonsRef,
    liftedButtonsRef,
  } = useTouchTimer({
    expectedFingerCount: expectedCount,
    onAllFingersDown: handleAllFingersDown,
    onFingerLift: handleFingerLift,
    onAllFingersLifted: handleAllFingersLifted,
    onFingerLostDuringCountdown: handleFingerLostDuringCountdown,
    onPositionChange: handlePositionChange,
    enabled: state.phase === 'touchWaiting' || state.phase === 'countdown' || state.phase === 'fingerTracking',
  });

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setIsTracking(true);
    startTracking();
    forceRender((n) => n + 1);
  }, [startTracking]);

  // Initialize button positions in circular layout on mount
  const positionsInitialized = useRef(false);
  useEffect(() => {
    if (!positionsInitialized.current && guessingPlayers.length > 0) {
      initPositions(guessingPlayers.length);
      positionsInitialized.current = true;
      forceRender((n) => n + 1);
    }
  }, [guessingPlayers.length, initPositions]);

  // Memoize button handlers per player index
  const buttonHandlersRef = useRef<Map<number, ReturnType<typeof createButtonHandlers>>>(new Map());
  const getHandlers = useCallback((playerIndex: number) => {
    if (!buttonHandlersRef.current.has(playerIndex)) {
      buttonHandlersRef.current.set(playerIndex, createButtonHandlers(playerIndex));
    }
    return buttonHandlersRef.current.get(playerIndex)!;
  }, [createButtonHandlers]);

  // Block gestures on the document
  useEffect(() => {
    const onGesture = (e: Event) => { e.preventDefault(); };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('gesturestart', onGesture, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', onGesture);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const heldCount = heldButtonsRef.current.size;

  return (
    <>
      {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      <div
        ref={containerRef}
        className="fixed inset-0 z-40"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: isTracking ? '#1a1a2e' : '#202124',
        }}
      >
        {/* Header text */}
        {!showCountdown && (
          <div className="absolute top-0 left-0 right-0 text-center text-white pt-12 px-[9px] z-10 pointer-events-none">
            {!isTracking ? (
              <>
                <h2 className="text-2xl font-bold mb-1">Place Your Fingers</h2>
                <p className="text-sm text-gray-300 mb-3">
                  Hold your button &mdash; drag to move it
                </p>
                <div className="text-4xl font-bold">
                  {heldCount} / {expectedCount}
                </div>
                {message && (
                  <div className="mt-3 bg-[#ff9800]/20 rounded-lg p-3 mx-auto max-w-[360px]">
                    <p className="text-[#ff9800] font-medium text-sm">{message}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xl text-gray-400">Lift your finger at the right moment...</p>
            )}
          </div>
        )}

        {/* Absolutely positioned player buttons */}
        {guessingPlayers.map((player, i) => {
          const pos = positionsRef.current.get(i);
          if (!pos) return null;

          const { hex } = PLAYER_COLORS[player.color];
          const textColor = idealTextColor(hex);
          const isHeld = heldButtonsRef.current.has(i);
          const hasLifted = liftedButtonsRef.current.has(i);
          const handlers = getHandlers(i);
          const pixel = getPixelPosition(pos);

          return (
            <div
              key={player.id}
              onPointerDown={handlers.onPointerDown as unknown as React.PointerEventHandler}
              onPointerMove={handlers.onPointerMove as unknown as React.PointerEventHandler}
              onPointerUp={handlers.onPointerUp as unknown as React.PointerEventHandler}
              onPointerCancel={handlers.onPointerCancel as unknown as React.PointerEventHandler}
              className="absolute flex flex-col items-center justify-center rounded-full select-none"
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                left: pixel.left,
                top: pixel.top,
                transform: `translate(-50%, -50%) ${isHeld ? 'scale(0.95)' : 'scale(1)'}`,
                backgroundColor: hasLifted ? '#4caf50' : hex,
                color: hasLifted ? '#ffffff' : textColor,
                touchAction: 'none',
                cursor: 'pointer',
                filter: isHeld ? 'brightness(0.9)' : 'none',
                outline: isHeld ? '6px solid #ff9800' : hasLifted ? '6px solid #4caf50' : 'none',
                outlineOffset: '4px',
                opacity: hasLifted ? 0.7 : 1,
                transition: 'transform 0.1s, filter 0.1s, outline 0.15s, background-color 0.2s',
                zIndex: isHeld ? 50 : 45,
              }}
            >
              <span className="text-lg font-bold leading-tight pointer-events-none">{player.name}</span>
              <span className="text-xs opacity-70 mt-1 pointer-events-none">
                {hasLifted ? 'Lifted!' : isHeld ? 'Holding...' : 'Hold Here'}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
