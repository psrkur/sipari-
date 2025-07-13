'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { API_ENDPOINTS } from '../lib/api'
import AddressManager from '../app/components/AddressManager'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
}

interface Address {
  id: number;
  title: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
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
  const [showAddressManager, setShowAddressManager] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [userAddresses, setUserAddresses] = useState<Address[]>([])
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

  useEffect(() => {
    const loadCustomerData = async () => {
      if (!token || !user) return

      try {
        console.log('Loading customer data...')
        const response = await axios.get(API_ENDPOINTS.CUSTOMER_PROFILE, {
          headers: { Authorization: `Bearer ${token}` }
        })

        console.log('Customer data response:', response.data)

        const customerInfo = {
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone || '',
          address: response.data.user.address || '',
          deliveryType: 'pickup' as const,
          paymentMethod: 'cash' as const
        }

        setCustomerData(customerInfo)
        setUserAddresses(response.data.addresses || [])
        
        // Varsayılan adresi seç
        const defaultAddress = response.data.addresses?.find((addr: Address) => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddress(defaultAddress)
          setValue('address', defaultAddress.address)
        } else {
          setValue('address', customerInfo.address)
        }
        
        // Form değerlerini set et
        setValue('name', customerInfo.name)
        setValue('email', customerInfo.email)
        setValue('phone', customerInfo.phone)
        setValue('deliveryType', customerInfo.deliveryType)
        setValue('paymentMethod', customerInfo.paymentMethod)
        
        console.log('Customer data loaded successfully:', customerInfo)
        toast.success('Müşteri bilgileriniz otomatik olarak dolduruldu')
      } catch (error: any) {
        console.error('Customer data loading error:', error)
        toast.error('Müşteri bilgileri yüklenemedi, lütfen manuel olarak doldurun')
      }
    }

    // Kullanıcı ve token varsa hemen yükle
    if (token && user) {
      loadCustomerData()
    }
  }, [token, user, setValue])

  // showCheckout değiştiğinde de yükle (ek güvenlik için)
  useEffect(() => {
    if (showCheckout && token && user && !customerData) {
      const loadCustomerData = async () => {
        try {
          console.log('Loading customer data for checkout...')
          const response = await axios.get(API_ENDPOINTS.CUSTOMER_PROFILE, {
            headers: { Authorization: `Bearer ${token}` }
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
          setUserAddresses(response.data.addresses || [])
          
          // Varsayılan adresi seç
          const defaultAddress = response.data.addresses?.find((addr: Address) => addr.isDefault)
          if (defaultAddress) {
            setSelectedAddress(defaultAddress)
            setValue('address', defaultAddress.address)
          } else {
            setValue('address', customerInfo.address)
          }
          
          // Form değerlerini set et
          setValue('name', customerInfo.name)
          setValue('email', customerInfo.email)
          setValue('phone', customerInfo.phone)
          setValue('deliveryType', customerInfo.deliveryType)
          setValue('paymentMethod', customerInfo.paymentMethod)
          
          console.log('Customer data loaded for checkout:', customerInfo)
        } catch (error: any) {
          console.error('Customer data loading error for checkout:', error)
        }
      }

      loadCustomerData()
    }
  }, [showCheckout, token, user, customerData, setValue])

  const handleCheckout = async (customerInfo: CustomerInfo) => {
    if (!selectedBranch) {
      toast.error('Lütfen bir şube seçin')
      return
    }

    if (items.length === 0) {
      toast.error('Sepetiniz boş')
      return
    }

    if (!customerInfo.deliveryType) {
      toast.error('Lütfen teslimat seçeneğini belirleyin')
      return
    }

    if (!token) {
      toast.error('Oturum süreniz dolmuş, lütfen tekrar giriş yapın')
      return
    }

    setLoading(true)
    try {
      const finalCustomerInfo = customerData || customerInfo

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

      await axios.post(API_ENDPOINTS.ORDERS, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Siparişiniz oluşturuldu, afiyet olsun! 🍕')
      clearCart()
      setShowCheckout(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sipariş oluşturulamadı')
    } finally {
      setLoading(false)
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
            <form onSubmit={handleSubmit(handleCheckout)} className="space-y-4">
              {customerData && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        ✅ Müşteri bilgileriniz otomatik olarak dolduruldu
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Kayıt olduğunuzda girdiğiniz bilgiler kullanılıyor. İsterseniz güncelleyebilirsiniz.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerData(null)
                        setValue('name', '')
                        setValue('email', '')
                        setValue('phone', '')
                        setValue('address', '')
                        toast.success('Form alanları temizlendi, yeni bilgiler girebilirsiniz')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Temizle
                    </button>
                  </div>
                </div>
              )}

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
                <p className="text-xs text-gray-500 mt-1">
                  Teslimat için gerekli
                </p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teslimat Adresi *
                    </label>
                    
                    {/* Adres Seçimi Bölümü */}
                    <div className="mb-4">
                      {userAddresses.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Kayıtlı Adresleriniz ({userAddresses.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowAddressManager(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                            >
                              + Yeni Adres Ekle
                            </button>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                            {userAddresses.map((address) => (
                              <div
                                key={address.id}
                                className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                                  selectedAddress?.id === address.id 
                                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                                }`}
                                onClick={() => {
                                  setSelectedAddress(address)
                                  setValue('address', address.address)
                                  toast.success(`${address.title} adresi seçildi`)
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-sm text-gray-900">
                                        {address.title}
                                      </span>
                                      {address.isDefault && (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                          Varsayılan
                                        </span>
                                      )}
                                      {selectedAddress?.id === address.id && (
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                          Seçili
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1">{address.address}</p>
                                  </div>
                                  {selectedAddress?.id === address.id && (
                                    <span className="text-blue-600 text-lg">✓</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              type="button"
                                                             onClick={() => {
                                 setSelectedAddress(null)
                                 setValue('address', '')
                                 toast.success('Manuel adres girişi için hazır')
                               }}
                              className="text-gray-600 hover:text-gray-800 text-sm underline"
                            >
                              Manuel Adres Gir
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddressManager(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              Adreslerimi Yönet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <p className="text-gray-500 mb-3">Henüz kayıtlı adresiniz yok</p>
                          <button
                            type="button"
                            onClick={() => setShowAddressManager(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                          >
                            + İlk Adresinizi Ekleyin
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Seçili Adres Gösterimi */}
                    {selectedAddress && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">✓</span>
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Seçili Adres: {selectedAddress.title}
                            </p>
                            <p className="text-xs text-green-600">{selectedAddress.address}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                      placeholder={selectedAddress ? "Adres detaylarını düzenleyebilirsiniz..." : "Detaylı teslimat adresi (mahalle, sokak, bina no, daire no)"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedAddress ? "Seçili adresinizi düzenleyebilir veya yeni adres ekleyebilirsiniz" : "Adrese teslim seçeneği için zorunlu"}
                    </p>
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                    )}
                  </div>

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
      
      {/* Adres Yöneticisi Modal */}
      {showAddressManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AddressManager
              onAddressSelect={(address) => {
                setSelectedAddress(address)
                setValue('address', address.address)
                setShowAddressManager(false)
                toast.success(`${address.title} adresi seçildi`)
              }}
              onClose={() => setShowAddressManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
} 