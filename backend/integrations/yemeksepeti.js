// Yemeksepeti Entegrasyonu
const axios = require('axios');
const crypto = require('crypto');

class YemeksepetiIntegration {
  constructor() {
    this.baseUrl = 'https://api.yemeksepeti.com/v1';
    this.apiKey = process.env.YEMEKSEPETI_API_KEY;
    this.apiSecret = process.env.YEMEKSEPETI_API_SECRET;
    this.restaurantId = process.env.YEMEKSEPETI_RESTAURANT_ID;
  }

  // Authentication
  getAuthHeaders() {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);
    
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
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
        restaurant_id: this.restaurantId,
        menu: products.map(product => this.formatProductForYemeksepeti(product))
      };
      
      const response = await axios.post(
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu`,
        menuData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti menu sync error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProduct(productId, productData) {
    try {
      const yemeksepetiProduct = this.formatProductForYemeksepeti(productData);
      
      const response = await axios.put(
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu/${productId}`,
        yemeksepetiProduct,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti product update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateAvailability(productId, isAvailable) {
    try {
      const availabilityData = {
        available: isAvailable
      };
      
      const response = await axios.patch(
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu/${productId}/availability`,
        availabilityData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti availability update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sipariş Yönetimi
  async getOrders(status = 'new', limit = 50) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/restaurants/${this.restaurantId}/orders?status=${status}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti orders fetch error:', error.response?.data || error.message);
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
        `${this.baseUrl}/restaurants/${this.restaurantId}/orders/${orderId}/status`,
        statusData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti order status update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async acceptOrder(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/restaurants/${this.restaurantId}/orders/${orderId}/accept`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti order accept error:', error.response?.data || error.message);
      throw error;
    }
  }

  async rejectOrder(orderId, reason) {
    try {
      const rejectData = {
        reason: reason || 'Ürün mevcut değil'
      };
      
      const response = await axios.post(
        `${this.baseUrl}/restaurants/${this.restaurantId}/orders/${orderId}/reject`,
        rejectData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Yemeksepeti order reject error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Ürün Format Dönüşümü
  formatProductForYemeksepeti(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: this.getCategoryId(product.category),
      available: product.isActive,
      image_url: product.imagePath || '',
      preparation_time: 15, // Dakika
      allergens: [], // Alerjen bilgileri
      nutritional_info: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    };
  }

  getCategoryId(category) {
    // Yemeksepeti kategori eşleştirmesi
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
  convertYemeksepetiOrder(yemeksepetiOrder) {
    return {
      customer: {
        name: yemeksepetiOrder.customer?.name || 'Müşteri',
        phone: yemeksepetiOrder.customer?.phone || '',
        address: yemeksepetiOrder.delivery_address || ''
      },
      items: yemeksepetiOrder.items?.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })) || [],
      totalAmount: yemeksepetiOrder.total_amount,
      platform: 'yemeksepeti',
      platformOrderId: yemeksepetiOrder.id,
      notes: yemeksepetiOrder.notes || '',
      status: yemeksepetiOrder.status,
      deliveryTime: yemeksepetiOrder.estimated_delivery_time
    };
  }

  // Webhook Doğrulama
  validateWebhook(req) {
    const signature = req.headers['x-yemeksepeti-signature'];
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
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data.menu?.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
        image: product.image_url,
        available: product.available
      })) || [];
    } catch (error) {
      console.error('Yemeksepeti products fetch error:', error.response?.data || error.message);
      // Test için mock data döndür
      return [
        { id: '1', name: 'Margarita Pizza', price: 48.00, category: 'pizza', available: true },
        { id: '2', name: 'Cheese Burger', price: 38.00, category: 'burger', available: true },
        { id: '3', name: 'Adana Kebap', price: 58.00, category: 'kebap', available: true }
      ];
    }
  }
}

module.exports = new YemeksepetiIntegration(); 