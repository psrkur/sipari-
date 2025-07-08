'use client'

import React from 'react'
import { useCartStore } from '../store/cart'

interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
  image?: string
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore()

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      quantity: 1
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {product.image && (
        <div className="h-48 bg-gray-200 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
          <span className="text-lg font-bold text-primary-600">
            ₺{product.price.toFixed(2)}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{product.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {product.category}
          </span>
          
          <button
            onClick={handleAddToCart}
            className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  )
} 