'use client'

import React, { useState } from 'react'
import { useCartStore } from '../store/cart'

interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string | { id: number; name: string; description: string; isActive: boolean }
  image?: string
  imagePath?: string
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore()
  const [imageError, setImageError] = useState(false)

  const handleAddToCart = () => {
    const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: categoryName,
      quantity: 1
    })
  }

  const handleImageError = () => {
    console.log('Resim yüklenemedi:', product.image)
    setImageError(true)
  }

  // Açıklamayı kısalt
  const truncateDescription = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <svg className="w-12 h-12 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Resim Yok</span>
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        {/* Ürün adı - tam yazılacak */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
          {product.name}
        </h3>
        
        {/* Açıklama - kısaltılacak */}
        <p className="text-sm text-gray-600 mb-3 flex-grow">
          {truncateDescription(product.description)}
        </p>
        
        {/* Alt kısım - kategori, fiyat ve buton */}
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {typeof product.category === 'object' ? product.category.name : product.category}
            </span>
            
            {/* Fiyat - alt kısma taşındı */}
            <span className="text-lg font-bold text-primary-600">
              ₺{product.price.toFixed(2)}
            </span>
          </div>
          
          <button
            onClick={handleAddToCart}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  )
} 