const { performance } = require('perf_hooks');

// Performans izleme sistemi
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueries = [];
    this.maxSlowQueries = 100;
    this.slowQueryThreshold = 1000; // 1 saniye
  }

  // Sorgu performansını izle
  async monitorQuery(name, queryFn) {
    const start = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await queryFn();
      const end = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const duration = end - start;
      const memoryUsed = endMemory - startMemory;
      
      // Metrikleri kaydet
      this.recordMetric(name, duration, memoryUsed);
      
      // Yavaş sorguları kaydet
      if (duration > this.slowQueryThreshold) {
        this.recordSlowQuery(name, duration, memoryUsed);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      this.recordError(name, duration, error);
      throw error;
    }
  }

  // Metrik kaydet
  recordMetric(name, duration, memoryUsed) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        totalMemory: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0
      });
    }
    
    const metric = this.metrics.get(name);
    metric.count++;
    metric.totalDuration += duration;
    metric.totalMemory += memoryUsed;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
  }

  // Yavaş sorgu kaydet
  recordSlowQuery(name, duration, memoryUsed) {
    this.slowQueries.push({
      name,
      duration,
      memoryUsed,
      timestamp: new Date()
    });
    
    // En eski kayıtları sil
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries.shift();
    }
  }

  // Hata kaydet
  recordError(name, duration, error) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        totalMemory: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0
      });
    }
    
    const metric = this.metrics.get(name);
    metric.errors++;
    metric.count++;
    metric.totalDuration += duration;
  }

  // Performans raporu oluştur
  generateReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        totalQueries: 0,
        totalDuration: 0,
        averageDuration: 0,
        totalErrors: 0,
        slowQueries: this.slowQueries.length
      },
      metrics: {},
      slowQueries: this.slowQueries.slice(-10), // Son 10 yavaş sorgu
      recommendations: []
    };
    
    // Metrikleri işle
    for (const [name, metric] of this.metrics.entries()) {
      report.summary.totalQueries += metric.count;
      report.summary.totalDuration += metric.totalDuration;
      report.summary.totalErrors += metric.errors;
      
      report.metrics[name] = {
        count: metric.count,
        averageDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
        minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
        maxDuration: metric.maxDuration,
        averageMemory: metric.count > 0 ? metric.totalMemory / metric.count : 0,
        errorRate: metric.count > 0 ? (metric.errors / metric.count) * 100 : 0
      };
    }
    
    report.summary.averageDuration = report.summary.totalQueries > 0 
      ? report.summary.totalDuration / report.summary.totalQueries 
      : 0;
    
    // Öneriler oluştur
    this.generateRecommendations(report);
    
    return report;
  }

  // Performans önerileri oluştur
  generateRecommendations(report) {
    const recommendations = [];
    
    // Yavaş sorgular için öneriler
    if (report.slowQueries.length > 0) {
      recommendations.push({
        type: 'slow_queries',
        priority: 'high',
        message: `${report.slowQueries.length} yavaş sorgu tespit edildi. İndeksler ve sorgu optimizasyonu önerilir.`
      });
    }
    
    // Hata oranı yüksek sorgular için öneriler
    for (const [name, metric] of Object.entries(report.metrics)) {
      if (metric.errorRate > 10) {
        recommendations.push({
          type: 'high_error_rate',
          priority: 'high',
          message: `${name} sorgusunda %${metric.errorRate.toFixed(1)} hata oranı. Hata yönetimi iyileştirilmeli.`
        });
      }
      
      if (metric.averageDuration > 500) {
        recommendations.push({
          type: 'slow_average',
          priority: 'medium',
          message: `${name} sorgusunun ortalama süresi ${metric.averageDuration.toFixed(0)}ms. Optimizasyon gerekli.`
        });
      }
    }
    
    // Bellek kullanımı için öneriler
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 500) {
      recommendations.push({
        type: 'high_memory',
        priority: 'high',
        message: `Yüksek bellek kullanımı: ${heapUsedMB.toFixed(0)}MB. Bellek optimizasyonu gerekli.`
      });
    }
    
    report.recommendations = recommendations;
  }

  // Metrikleri sıfırla
  reset() {
    this.metrics.clear();
    this.slowQueries = [];
  }

  // Belirli bir metrik için istatistik
  getMetricStats(name) {
    const metric = this.metrics.get(name);
    if (!metric) return null;
    
    return {
      name,
      count: metric.count,
      averageDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
      minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
      maxDuration: metric.maxDuration,
      errorRate: metric.count > 0 ? (metric.errors / metric.count) * 100 : 0
    };
  }

  // En yavaş sorguları listele
  getSlowestQueries(limit = 10) {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // En çok kullanılan sorguları listele
  getMostUsedQueries(limit = 10) {
    const sorted = Array.from(this.metrics.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);
    
    return sorted.map(([name, metric]) => ({
      name,
      count: metric.count,
      averageDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0
    }));
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Periyodik rapor oluştur
setInterval(() => {
  const report = performanceMonitor.generateReport();
  
  // Sadece sorun varsa logla
  if (report.recommendations.length > 0 || report.slowQueries.length > 0) {
    console.log('📊 Performans Raporu:');
    console.log(`🔍 Toplam Sorgu: ${report.summary.totalQueries}`);
    console.log(`⏱️ Ortalama Süre: ${report.summary.averageDuration.toFixed(2)}ms`);
    console.log(`❌ Toplam Hata: ${report.summary.totalErrors}`);
    console.log(`🐌 Yavaş Sorgu: ${report.summary.slowQueries}`);
    
    if (report.recommendations.length > 0) {
      console.log('💡 Öneriler:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec.message}`);
      });
    }
  }
}, 300000); // Her 5 dakika

module.exports = { PerformanceMonitor, performanceMonitor }; 