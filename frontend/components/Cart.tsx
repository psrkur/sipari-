'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { API_ENDPOINTS } from '../lib/api'
import AddressManager from '../app/components/AddressManager'
import { 
  ShoppingCart, 
  Truck, 
  Store, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Banknote,
  Globe,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Package,
  DollarSign
} from 'lucide-react'

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
  notes?: string
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
  const [cartPersisted, setCartPersisted] = useState(false)
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCartStore()
  const { token, user } = useAuthStore()
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<CustomerInfo>({
    defaultValues: {
      deliveryType: 'pickup',
      name: '',
      phone: '',
      email: '',
      address: '',
      paymentMethod: 'cash',
      notes: ''
    }
  })

  // Sepet verilerinin localStorage'da kalıcı olmasını sağla
  useEffect(() => {
    const checkCartPersistence = () => {
      const cartData = localStorage.getItem('cart-storage')
      if (cartData) {
        try {
          const parsed = JSON.parse(cartData)
          if (parsed.state && parsed.state.items && parsed.state.items.length > 0) {
            setCartPersisted(true)
            console.log('✅ Sepet verileri localStorage\'da mevcut:', parsed.state.items.length, 'ürün')
          }
        } catch (error) {
          console.error('Sepet verileri okunamadı:', error)
        }
      }
    }

    checkCartPersistence()
    
    // Her 5 saniyede bir sepet durumunu kontrol et
    const interval = setInterval(checkCartPersistence, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Müşteri verilerini yükle
  const loadCustomerData = useCallback(async () => {
    if (!token || !user) return

    try {
      console.log('🔄 Müşteri verileri yükleniyor...')
      const response = await axios.get(API_ENDPOINTS.CUSTOMER_PROFILE, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const customerInfo = {
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || '',
        address: response.data.user.address || '',
        deliveryType: 'pickup' as const,
        paymentMethod: 'cash' as const,
        notes: ''
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
      
      console.log('✅ Müşteri verileri başarıyla yüklendi')
      toast.success('Müşteri bilgileriniz otomatik olarak dolduruldu')
    } catch (error: any) {
      console.error('❌ Müşteri verileri yüklenemedi:', error)
      toast.error('Müşteri bilgileri yüklenemedi, lütfen manuel olarak doldurun')
    }
  }, [token, user, setValue])

  useEffect(() => {
    if (token && user) {
      loadCustomerData()
    }
  }, [token, user, loadCustomerData])

  // showCheckout değiştiğinde de yükle
  useEffect(() => {
    if (showCheckout && token && user && !customerData) {
      loadCustomerData()
    }
  }, [showCheckout, token, user, customerData, loadCustomerData])

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
        notes: customerInfo.notes || ''
      }

      await axios.post(API_ENDPOINTS.ORDERS, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Siparişiniz başarıyla oluşturuldu! 🍕 Afiyet olsun!')
      
      // Sepeti temizle
      clearCart()
      
      // Form'u temizle
      setCustomerData(null)
      setUserAddresses([])
      setSelectedAddress(null)
      setShowCheckout(false)
      reset()
      
      // Sayfayı yenileme yerine sadece sepeti temizle
      setTimeout(() => {
        toast.success('Sepetiniz temizlendi, yeni sipariş verebilirsiniz')
      }, 1000)
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sipariş oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const total = getTotal()
  const itemCount = getItemCount()
  const deliveryType = watch('deliveryType')
  const deliveryFee = deliveryType === 'delivery' ? 5.0 : 0.0
  const finalTotal = total + deliveryFee

  // Teslimat seçeneği değiştiğinde müşteri bilgilerini otomatik güncelle
  useEffect(() => {
    if (deliveryType === 'delivery' && customerData) {
      setValue('name', customerData.name)
      setValue('email', customerData.email)
      setValue('phone', customerData.phone)
      setValue('address', customerData.address)
      
      if (userAddresses.length > 0) {
        const defaultAddress = userAddresses.find(addr => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddress(defaultAddress)
          setValue('address', defaultAddress.address)
        }
      }
      
      toast.success('Adrese teslim için müşteri bilgileriniz otomatik dolduruldu')
    } else if (deliveryType === 'pickup') {
      if (customerData) {
        setValue('name', customerData.name)
        setValue('phone', customerData.phone)
        setValue('email', customerData.email)
        setValue('address', '')
        setSelectedAddress(null)
      }
    }
  }, [deliveryType, customerData, userAddresses, setValue])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Sepet Başlığı */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-6 w-6 text-white" />
            <h3 className="text-lg font-bold text-white">Sepetim</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full">
              {itemCount} ürün
            </span>
            {cartPersisted && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Kayıtlı
              </span>
            )}
          </div>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="p-8 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Sepetiniz Boş</h4>
          <p className="text-gray-500 mb-4">Lezzetli ürünlerimizi keşfetmek için ürünler sayfasına gidin</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Sepet Verileriniz Güvende</p>
                <p className="text-xs">Sayfa yenilendiğinde sepetiniz kaybolmaz</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          {/* Ürün Listesi */}
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="text-sm font-medium text-orange-600">₺{item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="px-3 py-2 text-sm font-medium min-w-[3rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      removeItem(item.id)
                      toast.success(`${item.name} sepetten kaldırıldı`)
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Toplam Fiyat */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Ara Toplam:</span>
                <span className="font-medium">₺{total.toFixed(2)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between items-center text-sm text-blue-600">
                  <span className="flex items-center space-x-1">
                    <Truck className="h-4 w-4" />
                    <span>Teslimat Ücreti:</span>
                  </span>
                  <span className="font-medium">₺{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Toplam:</span>
                  <span className="text-2xl font-bold text-orange-600">₺{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {!showCheckout ? (
            <button
              onClick={() => {
                if (!token) {
                  toast.error('Sipariş vermek için giriş yapmanız gerekiyor')
                  return
                }
                setShowCheckout(true)
              }}
              disabled={!selectedBranch}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {!selectedBranch ? 'Önce Şube Seçin' : !token ? 'Giriş Yapın' : 'Sipariş Ver'}
            </button>
          ) : (
            <form onSubmit={handleSubmit(handleCheckout)} className="space-y-6">
              {/* Müşteri Bilgileri Uyarısı */}
              {customerData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        ✅ Müşteri bilgileriniz otomatik olarak dolduruldu
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Kayıt olduğunuzda girdiğiniz bilgiler kullanılıyor. İsterseniz güncelleyebilirsiniz.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerData(null)
                          reset()
                          toast.success('Form alanları temizlendi, yeni bilgiler girebilirsiniz')
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Temizle
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValue('name', customerData.name)
                          setValue('email', customerData.email)
                          setValue('phone', customerData.phone)
                          setValue('address', customerData.address)
                          toast.success('Müşteri bilgileriniz tekrar yüklendi')
                        }}
                        className="text-xs text-green-600 hover:text-green-800 underline"
                      >
                        Yenile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Teslimat Seçenekleri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Teslimat Seçeneği *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    watch('deliveryType') === 'delivery' 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}>
                    <input
                      type="radio"
                      value="delivery"
                      {...register('deliveryType', { required: 'Teslimat seçeneği gerekli' })}
                      className="sr-only"
                    />
                    <Truck className="h-8 w-8 text-blue-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Adrese Teslim</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Kapınıza kadar</span>
                    {watch('deliveryType') === 'delivery' && (
                      <span className="text-xs text-blue-600 mt-2 font-medium">+₺5.00</span>
                    )}
                  </label>
                  
                  <label className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    watch('deliveryType') === 'pickup' 
                      ? 'border-green-500 bg-green-50 shadow-lg' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}>
                    <input
                      type="radio"
                      value="pickup"
                      {...register('deliveryType', { required: 'Teslimat seçeneği gerekli' })}
                      className="sr-only"
                    />
                    <Store className="h-8 w-8 text-green-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Şubeden Al</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Ücretsiz</span>
                    {watch('deliveryType') === 'pickup' && (
                      <span className="text-xs text-green-600 mt-2 font-medium">Ücretsiz</span>
                    )}
                  </label>
                </div>
                {errors.deliveryType && (
                  <p className="text-red-500 text-xs mt-2">{errors.deliveryType.message}</p>
                )}
              </div>
              
              {/* Müşteri Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Ad soyad gerekli' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ad Soyad"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    {...register('phone', { required: 'Telefon gerekli' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0555 123 45 67"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Teslimat için gerekli
                  </p>
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="ornek@email.com"
                />
              </div>

              {/* Adrese Teslim Seçenekleri */}
              {watch('deliveryType') === 'delivery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Teslimat Adresi *
                    </label>
                    
                    {/* Adres Seçimi */}
                    <div className="mb-4">
                      {userAddresses.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              📍 Kayıtlı Adresleriniz ({userAddresses.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowAddressManager(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                            >
                              + Yeni Adres Ekle
                            </button>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
                            {userAddresses.map((address) => (
                              <div
                                key={address.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
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
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAddress(null)
                                setValue('address', '')
                                toast.success('Manuel adres girişi için hazır')
                              }}
                              className="text-gray-600 hover:text-gray-800 text-sm underline"
                            >
                              ✏️ Manuel Adres Gir
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddressManager(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              ⚙️ Adreslerimi Yönet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 mb-3">Henüz kayıtlı adresiniz yok</p>
                          <button
                            type="button"
                            onClick={() => setShowAddressManager(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                          >
                            + İlk Adresinizi Ekleyin
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Seçili Adres Gösterimi */}
                    {selectedAddress && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

                  {/* Ödeme Yöntemi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Ödeme Yöntemi *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="cash"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                                                 <Banknote className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-gray-700">💵 Nakit</span>
                      </label>
                      <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="card"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-gray-700">💳 Kart (Kapıda)</span>
                      </label>
                      <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="online"
                          {...register('paymentMethod', { required: 'Ödeme yöntemi gerekli' })}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <Globe className="h-5 w-5 text-purple-600" />
                        <span className="text-sm text-gray-700">🌐 Online Ödeme</span>
                      </label>
                    </div>
                    {errors.paymentMethod && (
                      <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Şubeden Al Bilgisi */}
              {watch('deliveryType') === 'pickup' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Store className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Şubeden Alım Seçildi
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Siparişiniz hazır olduğunda <strong>{selectedBranch?.name}</strong> şubesinden alabilirsiniz.
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        💡 Adres bilgileri gerekli değil, sadece iletişim bilgilerinizi girin.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sipariş Notları
                </label>
                <textarea
                  {...register('notes')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Özel istekleriniz, alerjileriniz veya ek notlarınız..."
                />
              </div>

              {/* Butonlar */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Gönderiliyor...</span>
                    </div>
                  ) : (
                    'Siparişi Tamamla'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
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