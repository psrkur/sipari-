import { useState, useEffect, useCallback } from 'react';

interface PerformanceStats {
  memoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
  apiCalls: number;
  loadTime: number;
}

interface PerformanceMonitorProps {
  show?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function PerformanceMonitor({ 
  show = false, 
  position = 'top-right' 
}: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsage: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheSize: 0,
    apiCalls: 0,
    loadTime: 0
  });

  const [isVisible, setIsVisible] = useState(show);

  // Performans istatistiklerini güncelle
  const updateStats = useCallback(() => {
    if (typeof window === 'undefined') return;

    const newStats: PerformanceStats = {
      memoryUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheSize: 0,
      apiCalls: 0,
      loadTime: 0
    };

    // Bellek kullanımı
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      newStats.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    // Cache istatistikleri (global cache'den)
    if (typeof window !== 'undefined' && (window as any).__CACHE_STATS__) {
      const cacheStats = (window as any).__CACHE_STATS__;
      newStats.cacheHits = cacheStats.hits || 0;
      newStats.cacheMisses = cacheStats.misses || 0;
      newStats.cacheSize = cacheStats.size || 0;
    }

    // API çağrı sayısı
    if (typeof window !== 'undefined' && (window as any).__API_CALLS__) {
      newStats.apiCalls = (window as any).__API_CALLS__;
    }

    // Sayfa yükleme süresi
    if (performance.timing) {
      const timing = performance.timing;
      newStats.loadTime = timing.loadEventEnd - timing.navigationStart;
    }

    setStats(newStats);
  }, []);

  // Periyodik güncelleme
  useEffect(() => {
    if (!isVisible) return;

    updateStats();
    const interval = setInterval(updateStats, 2000); // Her 2 saniyede bir

    return () => clearInterval(interval);
  }, [isVisible, updateStats]);

  // Klavye kısayolu
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-black/90 text-white p-4 rounded-lg shadow-lg text-xs font-mono max-w-xs`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className={stats.memoryUsage > 50 ? 'text-red-400' : 'text-green-400'}>
            {stats.memoryUsage.toFixed(1)}MB
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Hits:</span>
          <span className="text-green-400">{stats.cacheHits}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Misses:</span>
          <span className="text-yellow-400">{stats.cacheMisses}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Size:</span>
          <span>{stats.cacheSize}</span>
        </div>
        
        <div className="flex justify-between">
          <span>API Calls:</span>
          <span className="text-blue-400">{stats.apiCalls}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Load Time:</span>
          <span className={stats.loadTime > 3000 ? 'text-red-400' : 'text-green-400'}>
            {stats.loadTime}ms
          </span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
} 