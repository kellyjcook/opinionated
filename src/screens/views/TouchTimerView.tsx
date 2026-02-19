import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../../state/gameContext';
import { useTouchTimer } from '../../hooks/useTouchTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { CountdownOverlay } from '../../components/ui/CountdownOverlay';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';
import type { FingerResult } from '../../types/game';

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

  const {
    startTracking,
    createButtonHandlers,
    heldButtonsRef,
    liftedButtonsRef,
    phaseRef,
  } = useTouchTimer({
    expectedFingerCount: expectedCount,
    onAllFingersDown: handleAllFingersDown,
    onFingerLift: handleFingerLift,
    onAllFingersLifted: handleAllFingersLifted,
    onFingerLostDuringCountdown: handleFingerLostDuringCountdown,
    enabled: state.phase === 'touchWaiting' || state.phase === 'countdown' || state.phase === 'fingerTracking',
  });

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setIsTracking(true);
    startTracking();
  }, [startTracking]);

  // Memoize button handlers per player index
  const buttonHandlersRef = useRef<Map<number, ReturnType<typeof createButtonHandlers>>>(new Map());
  const getHandlers = useCallback((playerIndex: number) => {
    if (!buttonHandlersRef.current.has(playerIndex)) {
      buttonHandlersRef.current.set(playerIndex, createButtonHandlers(playerIndex));
    }
    return buttonHandlersRef.current.get(playerIndex)!;
  }, [createButtonHandlers]);

  // Block gestures on the container
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
  const phase = phaseRef.current;

  return (
    <>
      {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: isTracking ? '#1a1a2e' : '#202124',
        }}
      >
        {!isTracking && !showCountdown && (
          <div className="text-center text-white px-[9px] w-full">
            <h2 className="text-2xl font-bold mb-2">Place Your Fingers</h2>
            <p className="text-sm text-gray-300 mb-4">
              Each guessing player: hold your button
            </p>

            {/* Finger counter */}
            <div className="text-4xl font-bold mb-4">
              {heldCount} / {expectedCount}
            </div>

            {message && (
              <div className="mb-4 bg-[#ff9800]/20 rounded-lg p-3 mx-auto max-w-[360px]">
                <p className="text-[#ff9800] font-medium text-sm">{message}</p>
              </div>
            )}

            {/* Player circle buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {guessingPlayers.map((player, i) => {
                const { hex } = PLAYER_COLORS[player.color];
                const textColor = idealTextColor(hex);
                const isHeld = heldButtonsRef.current.has(i);
                const handlers = getHandlers(i);

                return (
                  <div
                    key={player.id}
                    onPointerDown={handlers.onPointerDown as unknown as React.PointerEventHandler}
                    onPointerUp={handlers.onPointerUp as unknown as React.PointerEventHandler}
                    onPointerCancel={handlers.onPointerCancel as unknown as React.PointerEventHandler}
                    className="flex flex-col items-center justify-center rounded-full select-none transition-transform duration-100"
                    style={{
                      width: 110,
                      height: 110,
                      backgroundColor: hex,
                      color: textColor,
                      touchAction: 'none',
                      cursor: 'pointer',
                      transform: isHeld ? 'scale(0.95)' : 'scale(1)',
                      filter: isHeld ? 'brightness(0.9)' : 'none',
                      outline: isHeld ? '6px solid #ff9800' : 'none',
                      outlineOffset: isHeld ? '4px' : '0',
                    }}
                  >
                    <span className="text-lg font-bold leading-tight">{player.name}</span>
                    <span className="text-xs opacity-70 mt-1">
                      {isHeld ? 'Holding...' : 'Hold Here'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isTracking && (
          <div className="text-center text-white px-[9px] w-full">
            <p className="text-xl text-gray-400 mb-6">Lift your finger at the right moment...</p>

            {/* Show buttons during tracking — lifted ones show confirmation */}
            <div className="flex flex-wrap justify-center gap-4">
              {guessingPlayers.map((player, i) => {
                const { hex } = PLAYER_COLORS[player.color];
                const textColor = idealTextColor(hex);
                const hasLifted = liftedButtonsRef.current.has(i);
                const isHeld = heldButtonsRef.current.has(i) && phase === 'tracking';
                const handlers = getHandlers(i);

                return (
                  <div
                    key={player.id}
                    onPointerDown={handlers.onPointerDown as unknown as React.PointerEventHandler}
                    onPointerUp={handlers.onPointerUp as unknown as React.PointerEventHandler}
                    onPointerCancel={handlers.onPointerCancel as unknown as React.PointerEventHandler}
                    className="flex flex-col items-center justify-center rounded-full select-none transition-transform duration-100"
                    style={{
                      width: 110,
                      height: 110,
                      backgroundColor: hasLifted ? '#4caf50' : hex,
                      color: hasLifted ? '#ffffff' : textColor,
                      touchAction: 'none',
                      transform: isHeld ? 'scale(0.95)' : 'scale(1)',
                      filter: isHeld ? 'brightness(0.9)' : 'none',
                      outline: isHeld ? '6px solid #ff9800' : hasLifted ? '6px solid #4caf50' : 'none',
                      outlineOffset: '4px',
                      opacity: hasLifted ? 0.7 : 1,
                    }}
                  >
                    <span className="text-lg font-bold leading-tight">{player.name}</span>
                    {hasLifted && (
                      <span className="text-xs mt-1">Lifted!</span>
                    )}
                    {!hasLifted && (
                      <span className="text-xs opacity-70 mt-1">Holding...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
