'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
}

interface CustomerInfo {
  name: string
  phone: string
  email: string
  address: string
  deliveryType: 'delivery' | 'pickup'
  paymentMethod?: 'cash' | 'card' | 'online'
}

interface CartProps {
  selectedBranch: Branch | null
}

export default function Cart({ selectedBranch }: CartProps) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerInfo | null>(null)
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()
  const { token, user } = useAuthStore()
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CustomerInfo>({
    defaultValues: {
      deliveryType: 'pickup',
      name: '',
      phone: '',
      email: '',
      address: '',
      paymentMethod: 'cash'
    }
  })

  // Müşteri bilgilerini otomatik olarak yükle
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!token || !user) return

      try {
        const response = await axios.get('http://localhost:3001/api/customer/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const customerInfo = {
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone || '',
          address: response.data.user.address || '',
          deliveryType: 'pickup' as const,
          paymentMethod: 'cash' as const
        }

        setCustomerData(customerInfo)
        
        // Form alanlarını otomatik doldur
        setValue('name', customerInfo.name)
        setValue('email', customerInfo.email)
        setValue('phone', customerInfo.phone)
        setValue('address', customerInfo.address)
        setValue('deliveryType', customerInfo.deliveryType)
      } catch (error) {
        console.error('Müşteri bilgileri yüklenemedi:', error)
      }
    }

    if (showCheckout) {
      loadCustomerData()
    }
  }, [showCheckout, token, user, setValue])

  const handleCheckout = async (customerInfo: CustomerInfo) => {
    console.log('=== SİPARİŞ TAMAMLAMA BAŞLADI ===')
    console.log('handleCheckout called with:', customerInfo)
    console.log('selectedBranch:', selectedBranch)
    console.log('items:', items)
    console.log('token:', token ? 'Token mevcut' : 'Token yok')
    console.log('user:', user)
    
    if (!selectedBranch) {
      console.log('❌ Şube seçilmemiş')
      toast.error('Lütfen bir şube seçin')
      return
    }

    if (items.length === 0) {
      console.log('❌ Sepet boş')
      toast.error('Sepetiniz boş')
      return
    }

    if (!customerInfo.deliveryType) {
      console.log('❌ Teslimat seçeneği belirlenmemiş')
      toast.error('Lütfen teslimat seçeneğini belirleyin')
      return
    }

    if (!token) {
      console.log('❌ Token yok')
      toast.error('Oturum süreniz dolmuş, lütfen tekrar giriş yapın')
      return
    }

    setLoading(true)
    try {
      console.log('🔄 Sipariş oluşturuluyor...')
      
      // Müşteri bilgilerini kullan (form verileri veya otomatik yüklenen veriler)
      const finalCustomerInfo = customerData || customerInfo
      console.log('finalCustomerInfo:', finalCustomerInfo)

      const orderData = {
        branchId: selectedBranch.id,
        items: items.map(item => ({
          productId: item.id,
          price: item.price,
          quantity: item.quantity
        })),
        customerInfo: finalCustomerInfo,
        deliveryType: customerInfo.deliveryType,
        paymentMethod: customerInfo.paymentMethod || 'cash',
        notes: ''
      }

      console.log('📤 Sending order data:', orderData)

      const response = await axios.post('http://localhost:3001/api/orders', orderData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log('✅ Order response:', response.data)
      toast.success('Siparişiniz oluşturuldu, afiyet olsun! 🍕')
      clearCart()
      setShowCheckout(false)
    } catch (error: any) {
      console.error('❌ Order error:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)
      toast.error(error.response?.data?.error || 'Sipariş oluşturulamadı')
    } finally {
      setLoading(false)
      console.log('=== SİPARİŞ TAMAMLAMA BİTTİ ===')
    }
  }

  const total = getTotal()
  const deliveryType = watch('deliveryType')
  const deliveryFee = deliveryType === 'delivery' ? 5.0 : 0.0
  const finalTotal = total + deliveryFee

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sepet</h3>
      
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Sepetiniz boş</p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-600">₺{item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-12 px-2 py-1 text-sm border rounded"
                  />
                  
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Ara Toplam:</span>
                <span>₺{total.toFixed(2)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between items-center text-sm text-blue-600">
                  <span>🚚 Teslimat Ücreti:</span>
                  <span>₺{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-semibold border-t pt-2">
                <span>Toplam:</span>
                <span className="text-lg">₺{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              disabled={!selectedBranch}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sipariş Ver
            </button>
          ) : (
            <form 
              onSubmit={handleSubmit(handleCheckout)} 
              className="space-y-4"
            >
              {customerData && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    ✅ Müşteri bilgileriniz otomatik olarak dolduruldu
                  </p>
                </div>
              )}

              {/* Teslimat Seçeneği */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teslimat Seçeneği *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="delivery"
                      {...register('deliveryType', { required: 'Teslimat seçeneği gerekli' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">🚚 Adrese Teslim</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="pickup"
                      {...register('deliveryType', { required: 'Teslimat seçeneği gerekli' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">🏪 Şubeden Al</span>
                  </label>
                </div>
                {errors.deliveryType && (
                  <p className="text-red-500 text-xs mt-1">{errors.deliveryType.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Ad soyad gerekli' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Ad Soyad"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Telefon gerekli' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0555 123 45 67"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="ornek@email.com"
                />
              </div>

              {watch('deliveryType') === 'delivery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teslimat Adresi *
                    </label>
                    <textarea
                      {...register('address', { 
                        required: watch('deliveryType') === 'delivery' ? 'Teslimat adresi gerekli' : false,
                        validate: (value) => {
                          if (watch('deliveryType') === 'delivery' && !value) {
                            return 'Teslimat adresi gerekli'
                          }
                          return true
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                      placeholder="Teslimat adresi"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  {/* Ödeme Yöntemi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ödeme Yöntemi *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="cash"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">💵 Nakit</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="card"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">💳 Kart (Kapıda)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="online"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">🌐 Online Ödeme</span>
                      </label>
                    </div>
                    {errors.paymentMethod && (
                      <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message}</p>
                    )}
                  </div>
                </>
              )}

              {watch('deliveryType') === 'pickup' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    📍 Siparişiniz hazır olduğunda {selectedBranch?.name} şubesinden alabilirsiniz.
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md text-sm hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Gönderiliyor...' : 'Siparişi Tamamla'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
} 