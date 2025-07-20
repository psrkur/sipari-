import React from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category?: {
    id: number;
    name: string;
  } | null;
  branch?: {
    id: number;
    name: string;
  } | null;
  isActive: boolean;
  image?: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

interface Branch {
  id: number;
  name: string;
}

interface ProductManagementProps {
  products: Product[];
  categories: Category[];
  branches: Branch[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  onToggleProductStatus?: (productId: number, isActive: boolean) => void;
  user?: any;
}

const ProductManagement: React.FC<ProductManagementProps> = ({ products, categories, branches, onEditProduct, onDeleteProduct, onToggleProductStatus, user }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Ürünler ({products.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 rounded-md object-cover mr-3"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.category?.name || 'Kategori Yok'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.branch?.name || 'Şube Yok'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₺{product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {user && user.role === 'SUPER_ADMIN' ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔧 Düzenle butonu tıklandı:', product);
                            console.log('🔧 User role:', user?.role);
                            console.log('🔧 User role type:', typeof user?.role);
                            console.log('🔧 User role comparison:', user?.role === 'SUPER_ADMIN');
                            console.log('🔧 onEditProduct function:', typeof onEditProduct);
                            console.log('🔧 Event target:', e.target);
                            console.log('🔧 Event currentTarget:', e.currentTarget);
                            console.log('🔧 Product data:', JSON.stringify(product, null, 2));
                            
                            // Basit test - sadece console.log
                            console.log('🔧 Test: Buton tıklandı ve çalışıyor');
                            
                            // Multiple fallback mechanisms
                            let success = false;
                            
                            // Method 1: Direct function call
                            try {
                              if (typeof onEditProduct === 'function') {
                                console.log('🔧 Method 1: Direct onEditProduct çağrılıyor...');
                                onEditProduct(product);
                                console.log('✅ Method 1: onEditProduct başarıyla çağrıldı');
                                success = true;
                              }
                            } catch (error) {
                              console.error('❌ Method 1 hatası:', error);
                            }
                            
                            // Method 2: Global window function
                            if (!success) {
                              try {
                                if (typeof window !== 'undefined' && (window as any).editProductTest) {
                                  console.log('🔧 Method 2: Global editProductTest çağrılıyor...');
                                  (window as any).editProductTest(product);
                                  console.log('✅ Method 2: Global editProductTest başarıyla çağrıldı');
                                  success = true;
                                }
                              } catch (error) {
                                console.error('❌ Method 2 hatası:', error);
                              }
                            }
                            
                            // Method 3: Manual modal trigger
                            if (!success) {
                              try {
                                console.log('🔧 Method 3: Manuel modal tetikleme...');
                                if (typeof window !== 'undefined') {
                                  // Global state'leri manuel olarak set et
                                  if ((window as any).setEditingProduct) {
                                    (window as any).setEditingProduct(product);
                                  }
                                                                     if ((window as any).setEditProductForm) {
                                     const formData = {
                                       name: product.name,
                                       description: product.description || '',
                                       price: product.price.toString(),
                                       categoryId: (product.category?.id || '').toString(),
                                       branchId: (product.branch?.id || '').toString(),
                                       isActive: product.isActive
                                     };
                                     (window as any).setEditProductForm(formData);
                                   }
                                  if ((window as any).showEditProductModal) {
                                    (window as any).showEditProductModal(true);
                                  }
                                  console.log('✅ Method 3: Manuel modal tetikleme başarılı');
                                  success = true;
                                }
                              } catch (error) {
                                console.error('❌ Method 3 hatası:', error);
                              }
                            }
                            
                            // Method 4: DOM manipulation
                            if (!success) {
                              try {
                                console.log('🔧 Method 4: DOM manipulation...');
                                // Modal'ı manuel olarak göster
                                const modal = document.querySelector('[data-modal="edit-product"]');
                                if (modal) {
                                  (modal as HTMLElement).style.display = 'block';
                                  console.log('✅ Method 4: DOM manipulation başarılı');
                                  success = true;
                                }
                              } catch (error) {
                                console.error('❌ Method 4 hatası:', error);
                              }
                            }
                            
                            if (!success) {
                              console.error('❌ Tüm yöntemler başarısız oldu!');
                              alert('Düzenleme butonu çalışmıyor. Lütfen sayfayı yenileyin.');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          style={{ cursor: 'pointer' }}
                          data-testid="edit-product-button"
                          data-product-id={product.id}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </>
                    ) : user && user.role === 'BRANCH_MANAGER' && onToggleProductStatus ? (
                      <button
                        onClick={() => {
                          console.log('Toggle butonu tıklandı:', { 
                            productId: product.id, 
                            currentStatus: product.isActive, 
                            newStatus: !product.isActive,
                            onToggleProductStatus: !!onToggleProductStatus
                          });
                          onToggleProductStatus(product.id, !product.isActive);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          product.isActive 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {product.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Yetkisiz</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement; 