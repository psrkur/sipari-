import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/lib/api';

interface UseOptimizedFetchOptions {
  cacheTime?: number; // Cache süresi (ms)
  debounceTime?: number; // Debounce süresi (ms)
  retryCount?: number; // Retry sayısı
  retryDelay?: number; // Retry gecikmesi (ms)
  enabled?: boolean; // Fetch'in aktif olup olmadığı
}

interface UseOptimizedFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  clearCache: () => void;
}

// Global cache store
const cache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedFetch<T = any>(
  url: string,
  options: UseOptimizedFetchOptions = {}
): UseOptimizedFetchReturn<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 dakika
    debounceTime = 300,
    retryCount = 3,
    retryDelay = 1000,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Cache'den veri al
  const getCachedData = useCallback((cacheKey: string): T | null => {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  }, [cacheTime]);

  // Cache'e veri kaydet
  const setCachedData = useCallback((cacheKey: string, data: T) => {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }, []);

  // Cache temizle
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  // Fetch fonksiyonu
  const fetchData = useCallback(async (config?: AxiosRequestConfig) => {
    if (!enabled) return;

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
        setData(cachedData);
        setLoading(false);
        return;
      }

      // API base URL'yi kullan
      const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;
      console.log('🔍 OptimizedFetch URL:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        ...config,
        signal: abortControllerRef.current.signal,
        timeout: 10000
      });

      setData(response.data);
      setCachedData(url, response.data);
      retryCountRef.current = 0; // Başarılı istek sonrası retry sayacını sıfırla
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // İptal edilen istek
      }

      console.error('Fetch error:', err);

      // Retry logic
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => {
          fetchData(config);
        }, retryDelay);
        return;
      }

      setError(err.message || 'Veri yüklenemedi');
      retryCountRef.current = 0;
    } finally {
      setLoading(false);
    }
  }, [url, enabled, getCachedData, setCachedData, retryCount, retryDelay]);

  // Debounced fetch
  const debouncedFetch = useCallback((config?: AxiosRequestConfig) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchData(config);
    }, debounceTime);
  }, [fetchData, debounceTime]);

  // Refetch fonksiyonu
  const refetch = useCallback((config?: AxiosRequestConfig) => {
    cache.delete(url); // Cache'i temizle
    retryCountRef.current = 0; // Retry sayacını sıfırla
    fetchData(config);
  }, [url, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
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
    if (enabled) {
      debouncedFetch();
    }
  }, [enabled, debouncedFetch]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
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
  }, [callback, delay, enabled]);

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