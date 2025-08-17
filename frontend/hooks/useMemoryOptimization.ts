import { useEffect, useRef, useCallback } from 'react';

interface MemoryOptimizationOptions {
  maxMemoryUsage?: number; // MB cinsinden maksimum bellek kullanımı
  cleanupInterval?: number; // Temizlik aralığı (ms)
  enableLogging?: boolean; // Bellek kullanımını loglama
}

export function useMemoryOptimization(options: MemoryOptimizationOptions = {}) {
  const {
    maxMemoryUsage = 150, // 150MB'ye çıkarıldı
    cleanupInterval = 60000, // 60 saniyeye çıkarıldı
    enableLogging = false
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<number>(Date.now());

  // Bellek kullanımını kontrol et
  const checkMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMemoryMB = memory.totalJSHeapSize / 1024 / 1024;
      
      if (enableLogging) {
        console.log(`🧠 Memory Usage: ${usedMemoryMB.toFixed(2)}MB / ${totalMemoryMB.toFixed(2)}MB`);
      }

      // Bellek kullanımı yüksekse temizlik yap
      if (usedMemoryMB > maxMemoryUsage) {
        console.warn(`⚠️ High memory usage detected: ${usedMemoryMB.toFixed(2)}MB`);
        performCleanup();
      }
    }
  }, [maxMemoryUsage, enableLogging]);

  // Temizlik işlemleri
  const performCleanup = useCallback(() => {
    // Eski cache'leri temizle
    if (typeof window !== 'undefined') {
      // Session storage temizliği
      try {
        const keys = Object.keys(sessionStorage);
        const now = Date.now();
        
        keys.forEach(key => {
          try {
            const item = sessionStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed.timestamp && (now - parsed.timestamp) > 10 * 60 * 1000) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (e) {
            // Geçersiz JSON, sil
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Session storage cleanup failed:', e);
      }

      // Local storage temizliği
      try {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        
        keys.forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_')) {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && (now - parsed.timestamp) > 30 * 60 * 1000) {
                  localStorage.removeItem(key);
                }
              }
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        });
      } catch (e) {
        console.warn('Local storage cleanup failed:', e);
      }
    }

    lastCleanupRef.current = Date.now();
  }, []);

  // Bellek optimizasyonu başlat
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Periyodik bellek kontrolü - daha az sıklıkta
    intervalRef.current = setInterval(() => {
      checkMemoryUsage();
      
      // Belirli aralıklarla otomatik temizlik
      const timeSinceLastCleanup = Date.now() - lastCleanupRef.current;
      if (timeSinceLastCleanup > cleanupInterval) {
        performCleanup();
      }
    }, 30000); // 30 saniyede bir kontrol (10 saniyeden 30'a çıkarıldı)

    // Sayfa kapatılırken temizlik
    const handleBeforeUnload = () => {
      performCleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [checkMemoryUsage, performCleanup, cleanupInterval]);

  return {
    checkMemoryUsage,
    performCleanup
  };
}

// Optimize edilmiş event listener hook'u
export function useOptimizedEventListener(
  eventName: string,
  handler: (event: any) => void,
  element: EventTarget | null = typeof window !== 'undefined' ? window : null,
  options?: AddEventListenerOptions
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!element) return;

    const wrappedHandler = (event: any) => {
      handlerRef.current(event);
    };

    element.addEventListener(eventName, wrappedHandler, options);

    return () => {
      element.removeEventListener(eventName, wrappedHandler, options);
    };
  }, [eventName, element, options, handler]); // Tüm dependency'leri ekledik
}

// Optimize edilmiş resize observer hook'u
export function useOptimizedResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  element: Element | null
) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;

    observerRef.current = new ResizeObserver((entries) => {
      callbackRef.current(entries);
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [element, callback]); // callback dependency'sini ekledik
} 