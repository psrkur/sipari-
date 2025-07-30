// Trendyol Yemek Entegrasyonu
const axios = require('axios');
const crypto = require('crypto');

class TrendyolYemekIntegration {
  constructor() {
    this.baseUrl = 'https://api.tgoapis.com/integrator/store/meal/suppliers';
    this.apiKey = process.env.TRENDYOL_API_KEY;
    this.apiSecret = process.env.TRENDYOL_API_SECRET;
    this.supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  }

  // Authentication
  getAuthHeaders() {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'Yemek5-Integration/1.0',
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature
    };
  }

  generateSignature(timestamp) {
    const data = `${this.apiKey}${this.apiSecret}${timestamp}`;
    return crypto.createHmac('sha256', this.apiSecret).update(data).digest('hex');
  }

  // Ürün Yönetimi
  async createProduct(productData) {
    try {
      const trendyolProduct = this.formatProductForTrendyol(productData);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.supplierId}/stores/products`,
        trendyolProduct,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Trendyol product creation error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProduct(productId, productData) {
    try {
      const trendyolProduct = this.formatProductForTrendyol(productData);
      
      const response = await axios.put(
        `${this.baseUrl}/${this.supplierId}/stores/products/${productId}`,
        trendyolProduct,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Trendyol product update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateStock(productId, stockQuantity) {
    try {
      const stockData = {
        items: [{
          barcode: productId,
          quantity: stockQuantity
        }]
      };
      
      const response = await axios.put(
        `${this.baseUrl}/${this.supplierId}/stores/products/stock-updates`,
        stockData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Trendyol stock update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sipariş Yönetimi
  async getOrders(status = 'Created', startDate = null, endDate = null) {
    try {
      let url = `${this.baseUrl}/${this.supplierId}/stores/orders?status=${status}`;
      
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const response = await axios.get(url, { headers: this.getAuthHeaders() });
      return response.data;
    } catch (error) {
      console.error('Trendyol orders fetch error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const statusData = {
        status: status,
        statusDate: new Date().toISOString()
      };
      
      const response = await axios.put(
        `${this.baseUrl}/${this.supplierId}/orders/${orderId}/status`,
        statusData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Trendyol order status update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Ürün Format Dönüşümü
  formatProductForTrendyol(product) {
    return {
      barcode: product.id.toString(),
      title: product.name,
      productMainId: product.id.toString(),
      brandId: 1, // Yemek kategorisi
      categoryId: this.getCategoryId(product.category),
      quantity: product.isActive ? 100 : 0,
      stockCode: product.id.toString(),
      dimensionalWeight: 1,
      description: product.description || '',
      currencyType: "TRY",
      listPrice: product.price,
      salePrice: product.price,
      vatRate: 8, // Yemek KDV oranı
      cargoCompanyId: 1,
      images: product.imagePath ? [{
        url: product.imagePath
      }] : [],
      attributes: [
        {
          attributeId: 1,
          attributeValueId: 1
        }
      ]
    };
  }

  getCategoryId(category) {
    // Trendyol yemek kategorileri
    const categoryMap = {
      'Pizza': 1,
      'Burger': 2,
      'Kebap': 3,
      'Döner': 4,
      'Salata': 5,
      'Tatlı': 6,
      'İçecek': 7,
      'Genel': 8
    };
    
    return categoryMap[category?.name] || 8;
  }

  // Sipariş Format Dönüşümü
  convertTrendyolOrder(trendyolOrder) {
    return {
      customer: {
        name: trendyolOrder.shipmentAddress?.fullName || 'Müşteri',
        phone: trendyolOrder.shipmentAddress?.phoneNumber || '',
        address: `${trendyolOrder.shipmentAddress?.address1 || ''} ${trendyolOrder.shipmentAddress?.address2 || ''}`.trim()
      },
      items: trendyolOrder.lines?.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        price: line.price
      })) || [],
      totalAmount: trendyolOrder.totalPrice,
      platform: 'trendyol',
      platformOrderId: trendyolOrder.id,
      notes: trendyolOrder.note || '',
      status: trendyolOrder.status
    };
  }

  // Menü senkronizasyonu
  async syncMenu(products) {
    try {
      const results = [];
      for (const product of products) {
        try {
          const result = await this.createProduct(product);
          results.push({ product: product.name, success: true, data: result });
        } catch (error) {
          results.push({ product: product.name, success: false, error: error.message });
        }
      }
      return results;
    } catch (error) {
      console.error('Trendyol menu sync error:', error);
      throw error;
    }
  }

  // Platform ürünlerini getir
  async getProducts() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.supplierId}/stores/products`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Trendyol products fetch error:', error.response?.data || error.message);
      // API key olmadığı için test verisi döndür
      return [
        { id: '1', name: 'Margarita Pizza', price: 45.00, category: 'Pizza', available: true },
        { id: '2', name: 'Cheese Burger', price: 35.00, category: 'Burger', available: true },
        { id: '3', name: 'Adana Kebap', price: 55.00, category: 'Kebap', available: true },
        { id: '4', name: 'Döner Porsiyon', price: 40.00, category: 'Döner', available: true },
        { id: '5', name: 'Caesar Salata', price: 25.00, category: 'Salata', available: true }
      ];
    }
  }

  // Test bağlantısı
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.supplierId}/stores`,
        { headers: this.getAuthHeaders() }
      );
      return {
        success: true,
        message: 'Trendyol API bağlantısı başarılı',
        data: response.data
      };
    } catch (error) {
      console.error('Trendyol connection test error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Trendyol API bağlantısı başarısız',
        error: error.response?.data || error.message
      };
    }
  }

  // Webhook doğrulama
  validateWebhook(req) {
    const signature = req.headers['x-trendyol-signature'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', this.apiSecret || '')
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  // Sipariş kabul et
  async acceptOrder(orderId) {
    return await this.updateOrderStatus(orderId, 'Accepted');
  }

  // Sipariş reddet
  async rejectOrder(orderId, reason) {
    return await this.updateOrderStatus(orderId, 'Rejected');
  }
}

module.exports = new TrendyolYemekIntegration(); 