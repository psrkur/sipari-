'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MyFranchise {
  id: number;
  name: string;
  code: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  performanceScore: number;
  monthlyRoyalty: number;
  address: string;
  city: string;
  agreementDate: string;
  branch?: {
    id: number;
    name: string;
    address: string;
  };
  supportTickets?: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    createdAt: string;
  }>;
  performanceReports?: Array<{
    id: number;
    reportDate: string;
    monthlyRevenue: number;
    orderCount: number;
    customerCount: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    complianceScore: number;
  }>;
}

export default function FranchiseOwnerPage() {
  const { user } = useAuth();
  const [myFranchise, setMyFranchise] = useState<MyFranchise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportForm, setSupportForm] = useState({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium'
  });

  useEffect(() => {
    if (user) {
      loadMyFranchise();
    }
  }, [user]);

  const loadMyFranchise = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Oturum bulunamadı');
        return;
      }

      const response = await fetch('/api/franchise/my-franchise', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyFranchise(data.franchise);
      } else {
        setError('Franchise bilgisi alınamadı');
      }

    } catch (err) {
      console.error('My franchise load error:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token || !myFranchise) return;

      const response = await fetch(`/api/franchise/franchises/${myFranchise.id}/support-tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supportForm)
      });

      if (response.ok) {
        setShowSupportForm(false);
        setSupportForm({
          title: '',
          description: '',
          category: 'technical',
          priority: 'medium'
        });
        loadMyFranchise(); // Yeniden yükle
      } else {
        setError('Destek talebi oluşturulamadı');
      }
    } catch (err) {
      console.error('Support ticket creation error:', err);
      setError('Destek talebi oluşturulamadı');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'equipment': return 'Ekipman';
      case 'menu': return 'Menü';
      case 'training': return 'Eğitim';
      case 'technical': return 'Teknik';
      case 'other': return 'Diğer';
      default: return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!myFranchise) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Franchise Bulunamadı</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  Bu e-posta adresiyle ilişkili bir franchise bulunamadı.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏪 {myFranchise.name}</h1>
          <p className="mt-2 text-gray-600">Franchise Dashboard - {myFranchise.code}</p>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Performans Skoru</p>
                <p className="text-2xl font-semibold text-gray-900">{myFranchise.performanceScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aylık Royalty</p>
                <p className="text-2xl font-semibold text-gray-900">₺{myFranchise.monthlyRoyalty}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Açık Destek</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {myFranchise.supportTickets?.filter(t => t.status === 'open').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Franchise Bilgileri */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Franchise Bilgileri</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-gray-900">Durum:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(myFranchise.status)}`}>
                    {myFranchise.status === 'active' ? 'Aktif' : 
                     myFranchise.status === 'inactive' ? 'Pasif' : 
                     myFranchise.status === 'suspended' ? 'Askıya Alınmış' : myFranchise.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Adres:</span>
                  <p className="text-gray-600">{myFranchise.address}, {myFranchise.city}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Anlaşma Tarihi:</span>
                  <p className="text-gray-600">{new Date(myFranchise.agreementDate).toLocaleDateString('tr-TR')}</p>
                </div>
                {myFranchise.branch && (
                  <div>
                    <span className="font-medium text-gray-900">Atanan Şube:</span>
                    <p className="text-gray-600">{myFranchise.branch.name}</p>
                    <p className="text-gray-500 text-sm">{myFranchise.branch.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Destek Talepleri */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Destek Talepleri</h2>
              <button
                onClick={() => setShowSupportForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
              >
                Yeni Talep
              </button>
            </div>
            <div className="p-6">
              {myFranchise.supportTickets && myFranchise.supportTickets.length > 0 ? (
                <div className="space-y-3">
                  {myFranchise.supportTickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                          <div className="flex items-center mt-2 space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority === 'urgent' ? 'Acil' :
                               ticket.priority === 'high' ? 'Yüksek' :
                               ticket.priority === 'medium' ? 'Orta' :
                               ticket.priority === 'low' ? 'Düşük' : ticket.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getCategoryLabel(ticket.category)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ticket.status === 'open' ? 'text-blue-600 bg-blue-100' :
                          ticket.status === 'in_progress' ? 'text-yellow-600 bg-yellow-100' :
                          ticket.status === 'resolved' ? 'text-green-600 bg-green-100' :
                          'text-gray-600 bg-gray-100'
                        }`}>
                          {ticket.status === 'open' ? 'Açık' :
                           ticket.status === 'in_progress' ? 'İşlemde' :
                           ticket.status === 'resolved' ? 'Çözüldü' :
                           ticket.status === 'closed' ? 'Kapalı' : ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Henüz destek talebi bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>

        {/* Destek Talebi Formu Modal */}
        {showSupportForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Yeni Destek Talebi</h3>
                  <button
                    onClick={() => setShowSupportForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={createSupportTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlık
                    </label>
                    <input
                      type="text"
                      value={supportForm.title}
                      onChange={(e) => setSupportForm({...supportForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={supportForm.description}
                      onChange={(e) => setSupportForm({...supportForm, description: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategori
                      </label>
                      <select
                        value={supportForm.category}
                        onChange={(e) => setSupportForm({...supportForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="technical">Teknik</option>
                        <option value="equipment">Ekipman</option>
                        <option value="menu">Menü</option>
                        <option value="training">Eğitim</option>
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Öncelik
                      </label>
                      <select
                        value={supportForm.priority}
                        onChange={(e) => setSupportForm({...supportForm, priority: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSupportForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Gönder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 