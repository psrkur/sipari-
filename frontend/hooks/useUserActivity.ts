import { useState, useEffect, useRef } from 'react';

interface UseUserActivityOptions {
  timeout?: number; // Kullanıcının aktif olmadığı süre (ms)
  events?: string[]; // Dinlenecek event'ler
}

export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { 
    timeout = 30000, // 30 saniye varsayılan
    events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  } = options;

  const [isActive, setIsActive] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsActive(true);
    
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, timeout);
  };

  useEffect(() => {
    // Event listener'ları ekle
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // İlk timer'ı başlat
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeout, events]);

  return { isActive };
}
