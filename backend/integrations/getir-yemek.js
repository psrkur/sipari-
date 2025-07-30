// Getir Yemek Entegrasyonu
const axios = require('axios');
const crypto = require('crypto');

class GetirYemekIntegration {
  constructor() {
    this.baseUrl = 'https://api.getir.com/v1';
    this.apiKey = process.env.GETIR_API_KEY;
    this.apiSecret = process.env.GETIR_API_SECRET;
    this.restaurantId = process.env.GETIR_RESTAURANT_ID;
  }

  // Authentication
  getAuthHeaders() {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Getir-Signature': signature,
      'X-Getir-Timestamp': timestamp,
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
        menu_items: products.map(product => this.formatProductForGetir(product))
      };
      
      const response = await axios.post(
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu`,
        menuData,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Getir menu sync error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProduct(productId, productData) {
    try {
      const getirProduct = this.formatProductForGetir(productData);
      
      const response = await axios.put(
        `${this.baseUrl}/restaurants/${this.restaurantId}/menu/${productId}`,
        getirProduct,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Getir product update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProductAvailability(productId, isAvailable) {
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
      console.error('Getir availability update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sipariş Yönetimi
  async getOrders(status = 'pending', limit = 50) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/restaurants/${this.restaurantId}/orders?status=${status}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Getir orders fetch error:', error.response?.data || error.message);
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
      console.error('Getir order status update error:', error.response?.data || error.message);
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
      console.error('Getir order accept error:', error.response?.data || error.message);
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
      console.error('Getir order reject error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Ürün Format Dönüşümü
  formatProductForGetir(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: this.getCategoryId(product.category),
      available: product.isActive,
      image_url: product.imagePath || '',
      preparation_time: 20, // Dakika
      allergens: [], // Alerjen bilgileri
      nutritional_info: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      options: [], // Ek seçenekler (sos, boyut vb.)
      tags: [] // Etiketler (vegan, gluten-free vb.)
    };
  }

  getCategoryId(category) {
    // Getir kategori eşleştirmesi
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
  convertGetirOrder(getirOrder) {
    return {
      customer: {
        name: getirOrder.customer?.name || 'Müşteri',
        phone: getirOrder.customer?.phone || '',
        address: getirOrder.delivery_address || ''
      },
      items: getirOrder.items?.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        options: item.options || []
      })) || [],
      totalAmount: getirOrder.total_amount,
      platform: 'getir',
      platformOrderId: getirOrder.id,
      notes: getirOrder.notes || '',
      status: getirOrder.status,
      deliveryTime: getirOrder.estimated_delivery_time,
      paymentMethod: getirOrder.payment_method
    };
  }

  // Webhook Doğrulama
  validateWebhook(req) {
    const signature = req.headers['x-getir-signature'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = new GetirYemekIntegration(); 