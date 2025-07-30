// E-ticaret Platformları Entegrasyon Modülü
const axios = require('axios');
const logger = require('../utils/logger');

// Platform entegrasyonlarını import et
const trendyolIntegration = require('./trendyol-yemek');
const yemeksepetiIntegration = require('./yemeksepeti');
const getirIntegration = require('./getir-yemek');
const migrosIntegration = require('./migros-yemek');

class EcommerceIntegration {
  constructor() {
    this.platforms = {};
    this.isEnabled = process.env.ENABLE_ECOMMERCE_INTEGRATION === 'true';
    
    // Platform entegrasyonlarını kaydet
    this.integrations = {
      trendyol: trendyolIntegration,
      yemeksepeti: yemeksepetiIntegration,
      getir: getirIntegration,
      migros: migrosIntegration
    };
  }

  // Platform kaydetme
  registerPlatform(name, config) {
    this.platforms[name] = {
      config,
      isActive: config.enabled || false,
      lastSync: null
    };
    logger.info(`Platform registered: ${name}`);
  }

  // Platform durumu kontrol
  isPlatformActive(platformName) {
    return this.platforms[platformName]?.isActive || false;
  }

  // Platform açma/kapama
  togglePlatform(platformName, isActive) {
    if (this.platforms[platformName]) {
      this.platforms[platformName].isActive = isActive;
      logger.info(`Platform ${platformName} ${isActive ? 'activated' : 'deactivated'}`);
    }
  }

  // Menü senkronizasyonu
  async syncMenuToPlatform(platformName, branchId) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      const platform = this.platforms[platformName];
      const products = await this.getBranchProducts(branchId);
      
      // Platform'a özel entegrasyon kullan
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      let result;
      switch (platformName) {
        case 'trendyol':
          result = await integration.syncMenu(products);
          break;
        case 'yemeksepeti':
          result = await integration.syncMenu(products);
          break;
        case 'getir':
          result = await integration.syncMenu(products);
          break;
        case 'migros':
          result = await integration.syncMenu(products);
          break;
        default:
          throw new Error(`Unsupported platform: ${platformName}`);
      }
      
      platform.lastSync = new Date();
      logger.info(`Menu synced to ${platformName} for branch ${branchId}`);
      
      return result;
    } catch (error) {
      logger.error(`Menu sync failed for ${platformName}:`, error);
      throw error;
    }
  }

  // Sipariş alma
  async handlePlatformOrder(platformName, orderData) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      // Platform'a özel entegrasyon kullan
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      // Platform'dan gelen siparişi sistemimize çevir
      let convertedOrder;
      switch (platformName) {
        case 'trendyol':
          convertedOrder = integration.convertTrendyolOrder(orderData);
          break;
        case 'yemeksepeti':
          convertedOrder = integration.convertYemeksepetiOrder(orderData);
          break;
        case 'getir':
          convertedOrder = integration.convertGetirOrder(orderData);
          break;
        case 'migros':
          convertedOrder = integration.convertMigrosOrder(orderData);
          break;
        default:
          throw new Error(`Unsupported platform: ${platformName}`);
      }
      
      // Siparişi veritabanına kaydet
      const savedOrder = await this.saveOrder(convertedOrder);
      
      // Platform'a onay gönder
      await this.confirmOrderToPlatform(platformName, orderData.id, savedOrder.id);
      
      logger.info(`Order from ${platformName} processed: ${savedOrder.id}`);
      return savedOrder;
    } catch (error) {
      logger.error(`Order processing failed for ${platformName}:`, error);
      throw error;
    }
  }

  // Sipariş durumu güncelleme
  async updateOrderStatus(platformName, orderId, status) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      // Platform'a özel entegrasyon kullan
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      await integration.updateOrderStatus(orderId, status);
      
      logger.info(`Order status updated for ${platformName}: ${orderId} -> ${status}`);
    } catch (error) {
      logger.error(`Status update failed for ${platformName}:`, error);
      throw error;
    }
  }

  // Platform siparişlerini getir
  async getPlatformOrders(platformName, status = 'new', limit = 50) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      return await integration.getOrders(status, limit);
    } catch (error) {
      logger.error(`Failed to get orders from ${platformName}:`, error);
      throw error;
    }
  }

  // Platform siparişini kabul et
  async acceptPlatformOrder(platformName, orderId) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      await integration.acceptOrder(orderId);
      logger.info(`Order accepted for ${platformName}: ${orderId}`);
    } catch (error) {
      logger.error(`Failed to accept order from ${platformName}:`, error);
      throw error;
    }
  }

  // Platform siparişini reddet
  async rejectPlatformOrder(platformName, orderId, reason) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      await integration.rejectOrder(orderId, reason);
      logger.info(`Order rejected for ${platformName}: ${orderId}`);
    } catch (error) {
      logger.error(`Failed to reject order from ${platformName}:`, error);
      throw error;
    }
  }

  // Webhook doğrulama
  validateWebhook(platformName, req) {
    const integration = this.integrations[platformName];
    if (!integration) {
      return false;
    }

    return integration.validateWebhook(req);
  }

  // Yardımcı metodlar
  async getBranchProducts(branchId) {
    // Veritabanından şube ürünlerini al
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    return await prisma.product.findMany({
      where: { branchId: parseInt(branchId) },
      include: { category: true }
    });
  }

  async saveOrder(orderData) {
    // Siparişi veritabanına kaydet
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    return await prisma.order.create({
      data: orderData,
      include: { items: true, customer: true }
    });
  }

  // Platform'a onay gönderme
  async confirmOrderToPlatform(platformName, platformOrderId, systemOrderId) {
    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      // Platform'a özel onay gönderme
      switch (platformName) {
        case 'trendyol':
          await integration.updateOrderStatus(platformOrderId, 'accepted');
          break;
        case 'yemeksepeti':
          await integration.acceptOrder(platformOrderId);
          break;
        case 'getir':
          await integration.acceptOrder(platformOrderId);
          break;
        case 'migros':
          await integration.acceptOrder(platformOrderId);
          break;
        default:
          logger.warn(`No confirmation method for platform: ${platformName}`);
      }
    } catch (error) {
      logger.error(`Failed to confirm order to ${platformName}:`, error);
      throw error;
    }
  }

  // Platform durumu kontrol
  async checkPlatformHealth(platformName) {
    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        return { status: 'error', message: 'Integration not found' };
      }

      // Platform'a test isteği gönder
      const testResponse = await integration.getOrders('new', 1);
      
      return { 
        status: 'healthy', 
        message: 'Platform is responding',
        lastCheck: new Date()
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        lastCheck: new Date()
      };
    }
  }

  // Tüm platformların sağlık durumu
  async checkAllPlatformsHealth() {
    const healthStatus = {};
    
    for (const platformName of Object.keys(this.integrations)) {
      healthStatus[platformName] = await this.checkPlatformHealth(platformName);
    }
    
    return healthStatus;
  }

  // Platform ürünlerini getir
  async getPlatformProducts(platformName) {
    if (!this.isPlatformActive(platformName)) {
      throw new Error(`Platform ${platformName} is not active`);
    }

    try {
      const integration = this.integrations[platformName];
      if (!integration) {
        throw new Error(`Integration not found for platform: ${platformName}`);
      }

      // Platform'dan ürünleri çek
      const products = await integration.getProducts();
      
      return {
        platform: platformName,
        products: products,
        total: products.length,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get products from ${platformName}:`, error);
      throw error;
    }
  }
}

module.exports = new EcommerceIntegration(); 