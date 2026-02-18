import { useState, useEffect, useCallback } from 'react';

interface CountdownOverlayProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function CountdownOverlay({ onComplete, onCancel: _onCancel }: CountdownOverlayProps) {
  const [count, setCount] = useState(3);

  const handleComplete = useCallback(onComplete, [onComplete]);

  useEffect(() => {
    if (count === 0) {
      // Small delay after showing "GO!" before starting tracking
      const timer = setTimeout(handleComplete, 400);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(count === 1 ? 200 : 50);
      }
      setCount((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, handleComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        className="text-white font-bold transition-all duration-300"
        style={{
          fontSize: count === 0 ? '6rem' : '8rem',
          transform: `scale(${count === 0 ? 1.2 : 1})`,
          opacity: 1,
        }}
      >
        {count === 0 ? 'GO!' : count}
      </div>
    </div>
  );
}
