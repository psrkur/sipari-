'use client'

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Address {
  id: number;
  title: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
}

interface AddressManagerProps {
  onAddressSelect?: (address: Address) => void;
  showAddNew?: boolean;
  onClose?: () => void;
}

const AddressManager: React.FC<AddressManagerProps> = ({ 
  onAddressSelect, 
  showAddNew = false, 
  onClose 
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(showAddNew);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    isDefault: false
  });
  const { token } = useAuthStore();

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    if (!token) {
      console.error('Token bulunamadı');
      toast.error('Giriş yapmanız gerekiyor');
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.CUSTOMER_ADDRESSES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(response.data);
    } catch (error: any) {
      console.error('Adresler yüklenemedi:', error);
      console.error('Error response:', error.response);
      toast.error('Adresler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.address) {
      toast.error('Adres başlığı ve adres detayı gerekli');
      return;
    }

    try {
      if (editingAddress) {
        await axios.put(API_ENDPOINTS.CUSTOMER_UPDATE_ADDRESS(editingAddress.id), formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Adres güncellendi');
      } else {
        await axios.post(API_ENDPOINTS.CUSTOMER_ADD_ADDRESS, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Adres eklendi');
      }
      
      setFormData({ title: '', address: '', isDefault: false });
      setEditingAddress(null);
      setShowAddForm(false);
      fetchAddresses();
    } catch (error: any) {
      toast.error(`Adres ${editingAddress ? 'güncellenemedi' : 'eklenemedi'}: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      title: address.title,
      address: address.address,
      isDefault: address.isDefault
    });
    setShowAddForm(true);
  };

  const handleDelete = async (addressId: number) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.CUSTOMER_DELETE_ADDRESS(addressId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Adres silindi');
      fetchAddresses();
    } catch (error: any) {
      toast.error(`Adres silinemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleAddressSelect = (address: Address) => {
    if (onAddressSelect) {
      onAddressSelect(address);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {showAddForm ? (editingAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle') : 'Adreslerim'}
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Yeni Adres
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres Başlığı *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Örn: Ev, İş, Okul, Anne Evi"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres Detayı *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Mahalle, sokak, bina no, daire no, ilçe, şehir"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
          </div>
          
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-blue-800">
              Bu adresi varsayılan adres olarak ayarla
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {editingAddress ? 'Güncelle' : 'Adresi Ekle'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingAddress(null);
                setFormData({ title: '', address: '', isDefault: false });
              }}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">
                Henüz kayıtlı adresiniz yok
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + İlk Adresinizi Ekleyin
              </button>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-3">
                {addresses.length} adres kayıtlı
              </div>
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    address.isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                  onClick={() => handleAddressSelect(address)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{address.title}</h4>
                        {address.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Varsayılan
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{address.address}</p>
                    </div>
                    
                    {!onAddressSelect && (
                      <div className="flex space-x-2 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(address);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(address.id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressManager; 