const { PrismaClient } = require('@prisma/client');

// Bellek optimizasyonu için yardımcı fonksiyonlar
class MemoryOptimizer {
  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 dakika
  }

  // Sorgu sonuçlarını cache'le
  async cachedQuery(key, queryFn, timeout = this.cacheTimeout) {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    if (cached && (now - cached.timestamp) < timeout) {
      return cached.data;
    }
    
    const data = await queryFn();
    this.cache.set(key, {
      data,
      timestamp: now
    });
    
    return data;
  }

  // Cache'i temizle
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache temizlendi');
  }

  // Eski cache girişlerini temizle
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Bellek kullanımını izle
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  }

  // Sayfalama ile büyük veri setlerini işle
  async paginatedQuery(queryFn, pageSize = 100) {
    let page = 0;
    const results = [];
    
    while (true) {
      const data = await queryFn(page, pageSize);
      if (data.length === 0) break;
      
      results.push(...data);
      page++;
      
      // Bellek kullanımını kontrol et
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage.heapUsed > 500) { // 500MB'den fazla kullanılırsa
        console.log('⚠️ Yüksek bellek kullanımı, işlem durduruluyor');
        break;
      }
    }
    
    return results;
  }

  // Sorgu optimizasyonu - sadece gerekli alanları seç
  optimizeSelect(fields) {
    const select = {};
    fields.forEach(field => {
      if (typeof field === 'string') {
        select[field] = true;
      } else if (typeof field === 'object') {
        select[field.name] = {
          select: this.optimizeSelect(field.fields)
        };
      }
    });
    return select;
  }

  // Batch işlemler için optimize edilmiş sorgu
  async batchQuery(model, where, select, batchSize = 100) {
    const results = [];
    let skip = 0;
    
    while (true) {
      const batch = await this.prisma[model].findMany({
        where,
        select,
        skip,
        take: batchSize,
        orderBy: { id: 'asc' }
      });
      
      if (batch.length === 0) break;
      
      results.push(...batch);
      skip += batchSize;
      
      // Bellek kontrolü
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage.heapUsed > 500) {
        console.log('⚠️ Bellek limiti aşıldı, batch işlemi durduruluyor');
        break;
      }
    }
    
    return results;
  }

  // Gereksiz verileri temizle
  async cleanupOldData() {
    try {
      console.log('🧹 Eski veriler temizleniyor...');
      
      // 30 günden eski tamamlanmış siparişleri temizle
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedOrders = await this.prisma.order.deleteMany({
        where: {
          status: { in: ['DELIVERED', 'COMPLETED', 'CANCELLED'] },
          createdAt: { lt: thirtyDaysAgo }
        }
      });
      
      console.log(`✅ ${deletedOrders.count} eski sipariş temizlendi`);
      
      // Kullanılmayan resimleri temizle
      const products = await this.prisma.product.findMany({
        select: { image: true }
      });
      
      const usedImages = products
        .map(p => p.image)
        .filter(img => img && img.startsWith('/uploads/'));
      
      // Burada dosya sistemi kontrolü yapılabilir
      console.log(`📊 ${usedImages.length} kullanılan resim tespit edildi`);
      
    } catch (error) {
      console.error('❌ Veri temizleme hatası:', error);
    }
  }

  // Performans izleme
  async monitorPerformance() {
    const memoryUsage = this.getMemoryUsage();
    const cacheSize = this.cache.size;
    
    console.log('📊 Performans İstatistikleri:');
    console.log(`💾 Bellek Kullanımı: ${memoryUsage.heapUsed}MB / ${memoryUsage.heapTotal}MB`);
    console.log(`🔗 Cache Boyutu: ${cacheSize} giriş`);
    console.log(`📈 RSS: ${memoryUsage.rss}MB`);
    
    // Veritabanı bağlantı durumu
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('✅ Veritabanı bağlantısı aktif');
    } catch (error) {
      console.log('❌ Veritabanı bağlantı sorunu');
    }
  }

  // Bağlantıyı kapat
  async disconnect() {
    await this.prisma.$disconnect();
    this.clearCache();
  }
}

// Singleton instance
const memoryOptimizer = new MemoryOptimizer();

// Periyodik temizlik
setInterval(() => {
  memoryOptimizer.cleanupCache();
}, 60000); // Her dakika

// Bellek kullanımını izle
setInterval(() => {
  const usage = memoryOptimizer.getMemoryUsage();
  if (usage.heapUsed > 400) { // 400MB'den fazla kullanılırsa
    console.log('⚠️ Yüksek bellek kullanımı tespit edildi');
    memoryOptimizer.clearCache();
  }
}, 30000); // Her 30 saniye

module.exports = { MemoryOptimizer, memoryOptimizer }; 