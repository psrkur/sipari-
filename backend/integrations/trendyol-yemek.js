// Trendyol Yemek Entegrasyonu
const axios = require('axios');
const crypto = require('crypto');

class TrendyolYemekIntegration {
  constructor() {
    this.baseUrl = 'https://api.trendyol.com/sapigw/suppliers';
    this.apiKey = process.env.TRENDYOL_API_KEY;
    this.apiSecret = process.env.TRENDYOL_API_SECRET;
    this.supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  }

  // Authentication
  getAuthHeaders() {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    
    return {
      'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
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
        `${this.baseUrl}/${this.supplierId}/products`,
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
        `${this.baseUrl}/${this.supplierId}/products/${productId}`,
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
        `${this.baseUrl}/${this.supplierId}/products/stock-updates`,
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
      let url = `${this.baseUrl}/${this.supplierId}/orders?status=${status}`;
      
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
}

module.exports = new TrendyolYemekIntegration(); 