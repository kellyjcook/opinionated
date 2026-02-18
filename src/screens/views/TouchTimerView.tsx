import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../../state/gameContext';
import { useTouchTimer } from '../../hooks/useTouchTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { CountdownOverlay } from '../../components/ui/CountdownOverlay';
import type { FingerResult } from '../../types/game';

export function TouchTimerView() {
  const { state, dispatch } = useGame();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const [fingerCount, setFingerCount] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [message, setMessage] = useState('');
  const fingerCountRef = useRef(0);

  const expectedCount = state.expectedFingerCount;

  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

  const handleAllFingersDown = useCallback(() => {
    setShowCountdown(true);
    dispatch({ type: 'START_COUNTDOWN', startTime: performance.now() });
  }, [dispatch]);

  const handleFingerLift = useCallback((_touchId: number, _liftTimeMs: number) => {
    fingerCountRef.current -= 1;
    setFingerCount(fingerCountRef.current);
  }, []);

  const handleAllFingersLifted = useCallback((results: FingerResult[]) => {
    setIsTracking(false);
    dispatch({ type: 'ALL_FINGERS_LIFTED', results });
  }, [dispatch]);

  const handleFingerLostDuringCountdown = useCallback(() => {
    setShowCountdown(false);
    setMessage('A finger was lifted! Everyone place your fingers again.');
    dispatch({ type: 'CANCEL_COUNTDOWN' });
    setTimeout(() => setMessage(''), 3000);
  }, [dispatch]);

  const { elementRef, startTracking } = useTouchTimer({
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

  // Track finger count for display
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const onTouchStart = () => {
      fingerCountRef.current += 1;
      setFingerCount(fingerCountRef.current);
    };

    const onTouchEnd = () => {
      if (!isTracking) {
        fingerCountRef.current = Math.max(0, fingerCountRef.current - 1);
        setFingerCount(fingerCountRef.current);
      }
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [elementRef, isTracking]);

  return (
    <>
      {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      <div
        ref={elementRef}
        className="fixed inset-0 z-40 flex flex-col items-center justify-center"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: isTracking ? '#1a1a2e' : '#202124',
        }}
      >
        {!isTracking && !showCountdown && (
          <div className="text-center text-white px-8">
            <h2 className="text-3xl font-bold mb-4">Place Your Fingers</h2>
            <p className="text-lg text-gray-300 mb-8">
              All guessing players: place one finger on the screen
            </p>

            {/* Finger counter */}
            <div className="text-6xl font-bold mb-2">
              {fingerCount} / {expectedCount}
            </div>
            <p className="text-sm text-gray-400">fingers detected</p>

            {message && (
              <div className="mt-6 bg-[#ff9800]/20 rounded-lg p-4">
                <p className="text-[#ff9800] font-medium">{message}</p>
              </div>
            )}
          </div>
        )}

        {isTracking && (
          <div className="text-center text-white">
            <p className="text-xl text-gray-400">Lift your finger at the right moment...</p>
          </div>
        )}
      </div>
    </>
  );
}
