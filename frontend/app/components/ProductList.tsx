import React from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string | { id: number; name: string; description: string; isActive: boolean };
  image?: string;
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
  const grouped = groupProductsByCategory(products);
  return (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {categoryProducts.map((product) => (
                <div key={product.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-200 transform hover:scale-105 group">
                  {product.image && (
                    <div className="mb-3 sm:mb-4 relative overflow-hidden rounded-lg sm:rounded-xl">
                      <img
                        src={API_ENDPOINTS.IMAGE_URL(product.image)}
                        alt={product.name}
                        className="w-full h-32 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => { 
                          console.error('Resim yüklenemedi:', product.image);
                          (e.target as HTMLImageElement).style.display = 'none'; 
                        }}
                        onLoad={() => {
                          console.log('Resim başarıyla yüklendi:', product.image);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                    <h5 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2 sm:mb-0">{product.name}</h5>
                    <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      ₺{product.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <span className="text-xs text-gray-500 bg-orange-100 px-2 sm:px-3 py-1 rounded-full font-semibold self-start">
                      {typeof product.category === 'object' && product.category !== null ? product.category.name : product.category}
                    </span>
                    <button
                      onClick={() => onAddToCart(product)}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
  );
};

export default ProductList; 