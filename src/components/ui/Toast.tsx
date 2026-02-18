import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: 'bg-[#4caf50] text-white',
    error: 'bg-[#c5221f] text-white',
    info: 'bg-[#1a73e8] text-white',
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-lg ${colors[type]} text-sm font-medium animate-[slideDown_0.3s_ease-out]`}>
      {message}
    </div>
  );
}
