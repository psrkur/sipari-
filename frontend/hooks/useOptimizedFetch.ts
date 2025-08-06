import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosRequestConfig } from 'axios';
import apiClient from '@/lib/axios';

interface UseOptimizedFetchOptions {
  cacheTime?: number; // Cache süresi (ms)
  debounceTime?: number; // Debounce süresi (ms)
  retryCount?: number; // Retry sayısı
  retryDelay?: number; // Retry gecikmesi (ms)
  enabled?: boolean; // Fetch'in aktif olup olmadığı
  maxCacheSize?: number; // Maximum cache boyutu
  enableMemoryOptimization?: boolean; // Bellek optimizasyonu
}

interface UseOptimizedFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  clearCache: () => void;
  cacheStats: {
    size: number;
    hits: number;
    misses: number;
  };
}

// Gelişmiş cache store
class OptimizedCache {
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): { data: any; timestamp: number; hits: number } | null {
    const item = this.cache.get(key);
    if (item) {
      item.hits++;
      this.hits++;
      return item;
    }
    this.misses++;
    return null;
  }

  set(key: string, data: any): void {
    // Cache boyutunu kontrol et
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }
    
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(),
      hits: 0 
    });
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minHits = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.hits < minHits) {
        minHits = item.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses
    };
  }

  // Eski cache'leri temizle
  cleanup(maxAge: number): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const globalCache = new OptimizedCache(50); // Maximum 50 cache entry

// Memory leak önleme için cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

if (typeof window !== 'undefined') {
  // Her 5 dakikada bir eski cache'leri temizle
  cleanupInterval = setInterval(() => {
    globalCache.cleanup(10 * 60 * 1000); // 10 dakikadan eski cache'leri temizle
  }, 5 * 60 * 1000);

  // Sayfa kapatılırken cleanup
  window.addEventListener('beforeunload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });
}

export function useOptimizedFetch<T = any>(
  url: string,
  options: UseOptimizedFetchOptions = {}
): UseOptimizedFetchReturn<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 dakika
    debounceTime = 300,
    retryCount = 3,
    retryDelay = 1000,
    enabled = true,
    maxCacheSize = 50,
    enableMemoryOptimization = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Cache'den veri al
  const getCachedData = useCallback((cacheKey: string): T | null => {
    if (!enableMemoryOptimization) return null;
    
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  }, [cacheTime, enableMemoryOptimization]);

  // Cache'e veri kaydet
  const setCachedData = useCallback((cacheKey: string, data: T) => {
    if (!enableMemoryOptimization) return;
    
    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }, [enableMemoryOptimization]);

  // Cache temizle
  const clearCache = useCallback(() => {
    globalCache.clear();
  }, []);

  // Fetch fonksiyonu
  const fetchData = useCallback(async (config?: AxiosRequestConfig) => {
    if (!enabled || !isMountedRef.current) return;

    // Önceki isteği iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Yeni abort controller oluştur
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Cache kontrolü
      const cachedData = getCachedData(url);
      if (cachedData) {
        if (isMountedRef.current) {
          setData(cachedData);
          setLoading(false);
        }
        return;
      }

      // API base URL'yi kullan
      const fullUrl = url.startsWith('http') ? url : url;
      console.log('🔍 OptimizedFetch URL:', fullUrl);
      
      const response = await apiClient.get(fullUrl, {
        ...config,
        signal: abortControllerRef.current.signal
      });

      if (isMountedRef.current) {
        setData(response.data);
        setCachedData(url, response.data);
        retryCountRef.current = 0;
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || !isMountedRef.current) {
        return; // İptal edilen istek veya component unmount
      }

      console.error('Fetch error:', err);

      // Retry logic
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData(config);
          }
        }, retryDelay);
        return;
      }

      if (isMountedRef.current) {
        setError(err.message || 'Veri yüklenemedi');
        retryCountRef.current = 0;
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, enabled, getCachedData, setCachedData, retryCount, retryDelay]);

  // Debounced fetch
  const debouncedFetch = useCallback((config?: AxiosRequestConfig) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData(config);
      }
    }, debounceTime);
  }, [fetchData, debounceTime]);

  // Refetch fonksiyonu
  const refetch = useCallback((config?: AxiosRequestConfig) => {
    globalCache.clear(); // Cache'i temizle
    retryCountRef.current = 0;
    fetchData(config);
  }, [fetchData]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // İlk yükleme
  useEffect(() => {
    if (enabled && isMountedRef.current) {
      debouncedFetch();
    }
  }, [enabled, debouncedFetch]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    cacheStats: globalCache.getStats()
  };
}

// Optimize edilmiş interval hook'u
export function useOptimizedInterval(
  callback: () => void,
  delay: number,
  enabled: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(callback, delay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [delay, enabled]); // callback dependency'sini kaldırdık

  return intervalRef.current;
}

// Optimize edilmiş debounce hook'u
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Optimize edilmiş throttle hook'u
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
} 