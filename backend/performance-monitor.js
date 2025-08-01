const logger = require('./utils/logger');

class PerformanceMonitor {
  constructor() {
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      disconnections: 0,
      reconnections: 0,
      errors: 0,
      lastReset: new Date()
    };
    
    this.performanceMetrics = {
      avgResponseTime: 0,
      requestCount: 0,
      errorCount: 0,
      memoryUsage: 0
    };
    
    // Her 5 dakikada bir istatistikleri sıfırla
    setInterval(() => {
      this.resetStats();
    }, 5 * 60 * 1000);
  }

  // Bağlantı istatistikleri
  recordConnection(socketId) {
    this.connectionStats.totalConnections++;
    this.connectionStats.activeConnections++;
    logger.info(`🔌 Yeni bağlantı: ${socketId} (Aktif: ${this.connectionStats.activeConnections})`);
  }

  recordDisconnection(socketId, reason) {
    this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);
    this.connectionStats.disconnections++;
    logger.info(`❌ Bağlantı kesildi: ${socketId}, Sebep: ${reason} (Aktif: ${this.connectionStats.activeConnections})`);
  }

  recordReconnection(socketId, attemptNumber) {
    this.connectionStats.reconnections++;
    logger.info(`✅ Yeniden bağlandı: ${socketId}, Deneme: ${attemptNumber}`);
  }

  recordError(error, context) {
    this.connectionStats.errors++;
    this.performanceMetrics.errorCount++;
    logger.error(`❌ Hata (${context}):`, error);
  }

  // Performans metrikleri
  recordRequest(responseTime) {
    this.performanceMetrics.requestCount++;
    this.performanceMetrics.avgResponseTime = 
      (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.requestCount - 1) + responseTime) / 
      this.performanceMetrics.requestCount;
  }

  updateMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  // İstatistikleri sıfırla
  resetStats() {
    const oldStats = { ...this.connectionStats };
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: this.connectionStats.activeConnections, // Aktif bağlantıları koru
      disconnections: 0,
      reconnections: 0,
      errors: 0,
      lastReset: new Date()
    };
    
    logger.info('📊 Performans istatistikleri sıfırlandı:', {
      period: '5 dakika',
      totalConnections: oldStats.totalConnections,
      disconnections: oldStats.disconnections,
      reconnections: oldStats.reconnections,
      errors: oldStats.errors
    });
  }

  // İstatistikleri al
  getStats() {
    this.updateMemoryUsage();
    return {
      connections: this.connectionStats,
      performance: this.performanceMetrics,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Sağlık kontrolü
  getHealthStatus() {
    const stats = this.getStats();
    const isHealthy = 
      stats.performance.memoryUsage < 500 && // 500MB'dan az bellek kullanımı
      stats.performance.errorCount < 100 && // 5 dakikada 100'den az hata
      stats.connections.activeConnections > 0; // En az 1 aktif bağlantı

    return {
      healthy: isHealthy,
      status: isHealthy ? 'OK' : 'WARNING',
      details: {
        memoryUsage: `${stats.performance.memoryUsage}MB`,
        activeConnections: stats.connections.activeConnections,
        errorRate: stats.performance.errorCount,
        uptime: `${Math.round(stats.uptime / 60)} dakika`
      }
    };
  }

  // Log performans raporu
  logPerformanceReport() {
    const stats = this.getStats();
    const health = this.getHealthStatus();
    
    logger.info('📊 Performans Raporu:', {
      health: health.status,
      connections: {
        active: stats.connections.activeConnections,
        total: stats.connections.totalConnections,
        disconnections: stats.connections.disconnections,
        reconnections: stats.connections.reconnections
      },
      performance: {
        avgResponseTime: `${Math.round(stats.performance.avgResponseTime)}ms`,
        requestCount: stats.performance.requestCount,
        errorCount: stats.performance.errorCount,
        memoryUsage: `${stats.performance.memoryUsage}MB`
      },
      uptime: `${Math.round(stats.uptime / 60)} dakika`
    });
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Her 10 dakikada bir performans raporu logla
setInterval(() => {
  performanceMonitor.logPerformanceReport();
}, 10 * 60 * 1000);

module.exports = performanceMonitor; 