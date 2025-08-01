// E-ticaret Platformları API Endpoint'leri
const express = require('express');
const router = express.Router();
const ecommerceIntegration = require('./index');
const { authenticateToken } = require('../middleware/auth');

// Platform konfigürasyonu
router.post('/platforms/register', authenticateToken, async (req, res) => {
  try {
    const { platformName, config } = req.body;
    
    if (!platformName || !config) {
      return res.status(400).json({ 
        error: 'Platform name and config are required' 
      });
    }

    await ecommerceIntegration.registerPlatform(platformName, config);
    
    res.json({ 
      success: true, 
      message: `Platform ${platformName} registered successfully` 
    });
  } catch (error) {
    console.error('Platform registration error:', error);
    res.status(500).json({ error: 'Platform registration failed' });
  }
});

// Menü senkronizasyonu
router.post('/platforms/:platformName/sync-menu/:branchId', authenticateToken, async (req, res) => {
  try {
    const { platformName, branchId } = req.params;
    
    if (!ecommerceIntegration.isPlatformActive(platformName)) {
      return res.status(400).json({ 
        error: `Platform ${platformName} is not active` 
      });
    }

    const result = await ecommerceIntegration.syncMenuToPlatform(platformName, branchId);
    
    res.json({ 
      success: true, 
      message: `Menu synced to ${platformName}`,
      data: result 
    });
  } catch (error) {
    console.error('Menu sync error:', error);
    res.status(500).json({ error: 'Menu sync failed' });
  }
});

// Platform sipariş alma (webhook)
router.post('/platforms/:platformName/orders', async (req, res) => {
  try {
    const { platformName } = req.params;
    const orderData = req.body;
    
    // Webhook doğrulama (platform'a göre) - geçici olarak devre dışı
    // if (!validateWebhook(platformName, req)) {
    //   return res.status(401).json({ error: 'Invalid webhook signature' });
    // }

    if (!ecommerceIntegration.isPlatformActive(platformName)) {
      return res.status(400).json({ 
        error: `Platform ${platformName} is not active` 
      });
    }

    const savedOrder = await ecommerceIntegration.handlePlatformOrder(platformName, orderData);
    
    res.json({ 
      success: true, 
      message: `Order processed from ${platformName}`,
      orderId: savedOrder.id 
    });
  } catch (error) {
    console.error('Platform order processing error:', error);
    res.status(500).json({ error: 'Order processing failed' });
  }
});

// Sipariş durumu güncelleme
router.put('/platforms/:platformName/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { platformName, orderId } = req.params;
    const { status } = req.body;
    
    if (!ecommerceIntegration.isPlatformActive(platformName)) {
      return res.status(400).json({ 
        error: `Platform ${platformName} is not active` 
      });
    }

    await ecommerceIntegration.updateOrderStatus(platformName, orderId, status);
    
    res.json({ 
      success: true, 
      message: `Order status updated for ${platformName}` 
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Status update failed' });
  }
});

// Platform durumu kontrol
router.get('/platforms/:platformName/status', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    const isActive = ecommerceIntegration.isPlatformActive(platformName);
    const platform = ecommerceIntegration.platforms[platformName];
    
    res.json({
      platform: platformName,
      isActive,
      lastSync: platform?.lastSync,
      config: platform?.config ? {
        baseUrl: platform.config.baseUrl,
        enabled: platform.config.enabled
      } : null
    });
  } catch (error) {
    console.error('Platform status error:', error);
    res.status(500).json({ error: 'Failed to get platform status' });
  }
});

// Tüm platformların durumu
router.get('/platforms/status', authenticateToken, async (req, res) => {
  try {
    const platforms = Object.keys(ecommerceIntegration.platforms).map(name => {
      const platform = ecommerceIntegration.platforms[name];
      return {
        name,
        isActive: platform.isActive,
        lastSync: platform.lastSync,
        config: platform.config ? {
          baseUrl: platform.config.baseUrl,
          enabled: platform.config.enabled
        } : null
      };
    });
    
    res.json({ platforms });
  } catch (error) {
    console.error('Platforms status error:', error);
    res.status(500).json({ error: 'Failed to get platforms status' });
  }
});

// Platform siparişleri listesi
router.get('/platforms/:platformName/orders', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
        }
      }
    });
    
    const orders = await prisma.order.findMany({
      where: { platform: platformName },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });
    
    const total = await prisma.order.count({
      where: { platform: platformName }
    });
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Platform orders error:', error);
    res.status(500).json({ error: 'Failed to get platform orders' });
  }
});

// Son 10 sipariş geçmişi
router.get('/platforms/:platformName/recent-orders', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
        }
      }
    });
    
    const recentOrders = await prisma.order.findMany({
      where: { 
        platform: platformName,
        platformOrderId: { not: null }
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    res.json({
      success: true,
      orders: recentOrders
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({ error: 'Failed to get recent orders' });
  }
});

// Platform ürünlerini getir (senkronizasyon için)
router.get('/platforms/:platformName/products', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    
    if (!ecommerceIntegration.isPlatformActive(platformName)) {
      return res.status(400).json({ 
        error: `Platform ${platformName} is not active` 
      });
    }
    
    const products = await ecommerceIntegration.getPlatformProducts(platformName);
    
    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Platform products error:', error);
    res.status(500).json({ error: 'Failed to get platform products' });
  }
});

// Platform durumunu değiştir (açma/kapama)
router.put('/platforms/:platformName/toggle', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    const { isActive } = req.body;
    
    await ecommerceIntegration.togglePlatform(platformName, isActive);
    
    res.json({
      success: true,
      message: `Platform ${platformName} ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Platform toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle platform' });
  }
});

// Platform konfigürasyonlarını yeniden yükle
router.post('/platforms/reload-configs', authenticateToken, async (req, res) => {
  try {
    await ecommerceIntegration.reloadPlatformConfigs();
    
    res.json({
      success: true,
      message: 'Platform configurations reloaded successfully',
      platforms: Object.keys(ecommerceIntegration.platforms)
    });
  } catch (error) {
    console.error('Platform config reload error:', error);
    res.status(500).json({ error: 'Failed to reload platform configs' });
  }
});

// Platform bağlantı testi
router.post('/platforms/:platformName/test-connection', authenticateToken, async (req, res) => {
  try {
    const { platformName } = req.params;
    
    if (platformName === 'trendyol') {
      const trendyolIntegration = require('./trendyol-yemek');
      const result = await trendyolIntegration.testConnection();
      
      res.json(result);
    } else {
      res.json({
        success: false,
        message: `Test connection not implemented for ${platformName}`
      });
    }
  } catch (error) {
    console.error('Platform test connection error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test platform connection' 
    });
  }
});

// Webhook doğrulama fonksiyonu
function validateWebhook(platformName, req) {
  // Platform'a göre webhook doğrulama
  switch (platformName) {
    case 'getir':
      return validateGetirWebhook(req);
    case 'trendyol':
      return validateTrendyolWebhook(req);
    case 'yemeksepeti':
      return validateYemeksepetiWebhook(req);
    default:
      return true; // Test için
  }
}

function validateGetirWebhook(req) {
  // Getir webhook doğrulama
  const signature = req.headers['x-getir-signature'];
  const body = JSON.stringify(req.body);
  
  // HMAC doğrulama
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.GETIR_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
}

function validateTrendyolWebhook(req) {
  // Trendyol webhook doğrulama
  const signature = req.headers['x-trendyol-signature'];
  const body = JSON.stringify(req.body);
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.TRENDYOL_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
}

function validateYemeksepetiWebhook(req) {
  // Yemeksepeti webhook doğrulama
  const signature = req.headers['x-yemeksepeti-signature'];
  const body = JSON.stringify(req.body);
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.YEMEKSEPETI_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
}

module.exports = router; 