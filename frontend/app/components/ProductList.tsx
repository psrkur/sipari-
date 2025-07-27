import React, { useState } from 'react';
import { handleImageError } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string | { id: number; name: string; description: string; isActive: boolean };
  image?: string;
  imagePath?: string;
}

interface ProductListProps {
  products: Product[];
  selectedCategory: string;
  onAddToCart: (product: Product) => void;
  user: any;
  getCategoryIcon: (category: string) => string;
  API_ENDPOINTS: any;
}

const groupProductsByCategory = (products: Product[]) => {
  return products.reduce((acc, product) => {
    const categoryName = typeof product.category === 'object' && product.category !== null
      ? product.category.name
      : product.category || 'Diğer';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
};

const ProductList: React.FC<ProductListProps> = ({ products, selectedCategory, onAddToCart, user, getCategoryIcon, API_ENDPOINTS }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const grouped = groupProductsByCategory(products);

  // Açıklamayı kısalt
  const truncateDescription = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowProductModal(true);
  };

  const handleAddToCartFromModal = () => {
    if (selectedProduct) {
      // Sepete ekleme işlemi için quantity ile birlikte
      for (let i = 0; i < quantity; i++) {
        onAddToCart(selectedProduct);
      }
      setShowProductModal(false);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  return (
    <>
      <div className="space-y-8 sm:space-y-12">
        {Object.entries(grouped)
          .filter(([category]) => selectedCategory === 'Tümü' || category === selectedCategory)
          .map(([category, categoryProducts]) => (
            <div key={category} className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 mb-3 sm:mb-0">
                  <span className="text-2xl sm:text-3xl">{getCategoryIcon(category)}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900">{category}</h4>
                  <p className="text-sm sm:text-base text-gray-600">{categoryProducts.length} lezzetli seçenek</p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold mt-3 sm:mt-0">
                  {categoryProducts.length} ürün
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {categoryProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-200 transform hover:scale-105 group cursor-pointer flex flex-col h-full"
                    onClick={() => handleProductClick(product)}
                  >
                    {(product.image || product.imagePath) && (
                      <div className="mb-2 sm:mb-4 relative overflow-hidden rounded-lg sm:rounded-xl">
                        <img
                          src={product.image || product.imagePath}
                          alt={product.name}
                          className="w-full h-24 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                          crossOrigin="anonymous"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    )}
                    
                    {/* Ürün adı - tam yazılacak */}
                    <h5 className="text-sm sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2 sm:mb-3 leading-tight">
                      {product.name}
                    </h5>
                    
                    {/* Açıklama - kısaltılacak */}
                    <p className="text-xs sm:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-2">
                      {truncateDescription(product.description)}
                    </p>
                    
                    {/* Alt kısım - kategori, fiyat ve buton */}
                    <div className="mt-auto">
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <span className="text-xs text-gray-500 bg-orange-100 px-2 sm:px-3 py-1 rounded-full font-semibold">
                          {typeof product.category === 'object' && product.category !== null ? product.category.name : product.category}
                        </span>
                        
                        {/* Fiyat - alt kısma taşındı */}
                        <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                          ₺{product.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product);
                        }}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        🛒 Sepete Ekle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Ürün Detay Modalı */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Resim */}
              {(selectedProduct.image || selectedProduct.imagePath) && (
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={selectedProduct.image || selectedProduct.imagePath}
                    alt={selectedProduct.name}
                    className="w-full h-64 sm:h-80 object-cover"
                    crossOrigin="anonymous"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}

              {/* Ürün Bilgileri */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Ürün Açıklaması</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {selectedProduct.description || 'Bu ürün için açıklama bulunmamaktadır.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Kategori</h3>
                  <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {typeof selectedProduct.category === 'object' && selectedProduct.category !== null 
                      ? selectedProduct.category.name 
                      : selectedProduct.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Fiyat</h3>
                  <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    ₺{selectedProduct.price.toFixed(2)}
                  </span>
                </div>

                {/* Miktar Seçimi */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Miktar</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg sm:text-xl font-semibold text-gray-900 min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Toplam Fiyat */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      ₺{(selectedProduct.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sepete Ekle Butonu */}
                <button
                  onClick={handleAddToCartFromModal}
                  disabled={!user}
                  className={`w-full py-3 sm:py-4 px-6 rounded-xl text-lg sm:text-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    user
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {user ? `🛒 ${quantity} Adet Sepete Ekle` : '🔑 Giriş yapın'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList; 