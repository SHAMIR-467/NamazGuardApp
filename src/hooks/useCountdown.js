import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetTime) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, totalSeconds: 0 });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetTime) return;

    const tick = () => {
      try {
        const diff = Math.max(0, Math.floor((targetTime.getTime() - Date.now()) / 1000));
        setTimeLeft({
          h: Math.floor(diff / 3600),
          m: Math.floor((diff % 3600) / 60),
          s: diff % 60,
          totalSeconds: diff,
        });
      } catch (err) {
        console.warn('[useCountdown] tick error:', err.message);
      }
    };

    tick();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetTime]);

  const pad = n => String(n).padStart(2, '0');
  return { ...timeLeft, formatted: `${pad(timeLeft.h)}:${pad(timeLeft.m)}:${pad(timeLeft.s)}` };
}
