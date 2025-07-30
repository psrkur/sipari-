// Migros Yemek Entegrasyonu
const axios = require('axios');
const crypto = require('crypto');

class MigrosYemekIntegration {
  constructor() {
    this.baseUrl = 'https://api.migros.com.tr/v1';
    this.apiKey = process.env.MIGROS_API_KEY;
    this.apiSecret = process.env.MIGROS_API_SECRET;
    this.storeId = process.env.MIGROS_STORE_ID;
  }

  // Authentication
  getAuthHeaders() {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Migros-Signature': signature,
      'X-Migros-Timestamp': timestamp,
      'Content-Type': 'application/json',
      'User-Agent': 'Yemek5-Integration/1.0'
    };
  }

  generateSignature(timestamp) {
    const data = `${this.apiKey}${timestamp}`;
    return crypto.createHmac('sha256', this.apiSecret).update(data).digest('hex');
  }

  // Menü Yönetimi
  async syncMenu(products) {
    try {
      const menuData = {
        store_id: this.storeId,
        menu_items: products.map(product => this.formatProductForMigros(product))
      };
      
      const response = await axios.post(
        `${this.baseUrl}/stores/${this.storeId}/menu`,
        menuData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros menu sync error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProduct(productId, productData) {
    try {
      const migrosProduct = this.formatProductForMigros(productData);
      
      const response = await axios.put(
        `${this.baseUrl}/stores/${this.storeId}/menu/${productId}`,
        migrosProduct,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros product update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProductAvailability(productId, isAvailable) {
    try {
      const availabilityData = {
        available: isAvailable
      };
      
      const response = await axios.patch(
        `${this.baseUrl}/stores/${this.storeId}/menu/${productId}/availability`,
        availabilityData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros availability update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sipariş Yönetimi
  async getOrders(status = 'new', limit = 50) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/stores/${this.storeId}/orders?status=${status}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros orders fetch error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const statusData = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      const response = await axios.put(
        `${this.baseUrl}/stores/${this.storeId}/orders/${orderId}/status`,
        statusData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros order status update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async acceptOrder(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/stores/${this.storeId}/orders/${orderId}/accept`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros order accept error:', error.response?.data || error.message);
      throw error;
    }
  }

  async rejectOrder(orderId, reason) {
    try {
      const rejectData = {
        reason: reason || 'Ürün mevcut değil'
      };
      
      const response = await axios.post(
        `${this.baseUrl}/stores/${this.storeId}/orders/${orderId}/reject`,
        rejectData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Migros order reject error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Ürün Format Dönüşümü
  formatProductForMigros(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: this.getCategoryId(product.category),
      available: product.isActive,
      image_url: product.imagePath || '',
      preparation_time: 25, // Dakika
      allergens: [], // Alerjen bilgileri
      nutritional_info: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      ingredients: [], // Malzeme listesi
      cooking_instructions: '' // Pişirme talimatları
    };
  }

  getCategoryId(category) {
    // Migros kategori eşleştirmesi
    const categoryMap = {
      'Pizza': 'pizza',
      'Burger': 'burger',
      'Kebap': 'kebap',
      'Döner': 'doner',
      'Salata': 'salata',
      'Tatlı': 'tatli',
      'İçecek': 'icecek',
      'Genel': 'genel'
    };
    
    return categoryMap[category?.name] || 'genel';
  }

  // Sipariş Format Dönüşümü
  convertMigrosOrder(migrosOrder) {
    return {
      customer: {
        name: migrosOrder.customer?.name || 'Müşteri',
        phone: migrosOrder.customer?.phone || '',
        address: migrosOrder.delivery_address || ''
      },
      items: migrosOrder.items?.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })) || [],
      totalAmount: migrosOrder.total_amount,
      platform: 'migros',
      platformOrderId: migrosOrder.id,
      notes: migrosOrder.notes || '',
      status: migrosOrder.status,
      deliveryTime: migrosOrder.estimated_delivery_time,
      storeId: this.storeId
    };
  }

  // Webhook Doğrulama
  validateWebhook(req) {
    const signature = req.headers['x-migros-signature'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  // Platform ürünlerini getir
  async getProducts() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/stores/${this.storeId}/menu`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data.menu_items?.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
        image: product.image_url,
        available: product.available
      })) || [];
    } catch (error) {
      console.error('Migros products fetch error:', error.response?.data || error.message);
      // Test için mock data döndür
      return [
        { id: '1', name: 'Margarita Pizza', price: 50.00, category: 'pizza', available: true },
        { id: '2', name: 'Cheese Burger', price: 40.00, category: 'burger', available: true },
        { id: '3', name: 'Adana Kebap', price: 60.00, category: 'kebap', available: true }
      ];
    }
  }
}

module.exports = new MigrosYemekIntegration(); 