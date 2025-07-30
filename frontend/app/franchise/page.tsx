'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

interface Franchise {
  id: number;
  name: string;
  code: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  performanceScore: number;
  monthlyRoyalty: number;
  branch?: {
    id: number;
    name: string;
    address: string;
  };
  supportTickets?: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
  }>;
}

interface FranchiseStats {
  totalFranchises: number;
  activeFranchises: number;
  averagePerformanceScore: number;
  averageMonthlyRoyalty: number;
  openSupportTickets: number;
}

export default function FranchisePage() {
  const { user, token } = useAuthStore();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [stats, setStats] = useState<FranchiseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [showAddFranchiseModal, setShowAddFranchiseModal] = useState(false);
  const [franchiseForm, setFranchiseForm] = useState({
    name: '',
    code: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    city: '',
    monthlyRoyalty: 0,
    agreementDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      loadFranchiseData();
    }
  }, [user]);

  const loadFranchiseData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Oturum bulunamadı');
        return;
      }

      // Franchise listesi
      const franchisesResponse = await fetch('/api/franchise/franchises', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (franchisesResponse.ok) {
        const franchisesData = await franchisesResponse.json();
        setFranchises(franchisesData.franchises || []);
      }

      // İstatistikler
      const statsResponse = await fetch('/api/franchise/franchises/stats/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (err) {
      console.error('Franchise data load error:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
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

  const createFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!token) {
        setError('Oturum bulunamadı');
        return;
      }

      const response = await fetch('/api/franchise/franchises', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(franchiseForm)
      });

      if (response.ok) {
        setShowAddFranchiseModal(false);
        setFranchiseForm({
          name: '',
          code: '',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: '',
          address: '',
          city: '',
          monthlyRoyalty: 0,
          agreementDate: new Date().toISOString().split('T')[0]
        });
        loadFranchiseData(); // Yeniden yükle
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Franchise oluşturulamadı');
      }
    } catch (err) {
      console.error('Franchise creation error:', err);
      setError('Franchise oluşturulamadı');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏢 Franchise Yönetimi</h1>
              <p className="mt-2 text-gray-600">Franchise'larınızı yönetin ve performanslarını takip edin</p>
            </div>
            <button
              onClick={() => setShowAddFranchiseModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
            >
              ➕ Yeni Franchise Ekle
            </button>
          </div>
        </div>

        {/* İstatistikler */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Toplam Franchise</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalFranchises}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Aktif Franchise</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeFranchises}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ortalama Performans</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.averagePerformanceScore?.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Açık Destek</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.openSupportTickets}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Franchise Listesi */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Franchise Listesi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sahip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {franchises.map((franchise) => (
                  <tr key={franchise.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{franchise.name}</div>
                        <div className="text-sm text-gray-500">{franchise.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{franchise.ownerName}</div>
                        <div className="text-sm text-gray-500">{franchise.ownerEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(franchise.status)}`}>
                        {franchise.status === 'active' ? 'Aktif' : 
                         franchise.status === 'inactive' ? 'Pasif' : 
                         franchise.status === 'suspended' ? 'Askıya Alınmış' : franchise.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${franchise.performanceScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{franchise.performanceScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {franchise.branch ? (
                        <div>
                          <div className="font-medium">{franchise.branch.name}</div>
                          <div className="text-gray-500">{franchise.branch.address}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Atanmamış</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedFranchise(franchise)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Detay
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Franchise Detay Modal */}
        {selectedFranchise && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedFranchise.name} Detayları
                  </h3>
                  <button
                    onClick={() => setSelectedFranchise(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Franchise Bilgileri</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Kod:</span> {selectedFranchise.code}</div>
                      <div><span className="font-medium">Sahip:</span> {selectedFranchise.ownerName}</div>
                      <div><span className="font-medium">E-posta:</span> {selectedFranchise.ownerEmail}</div>
                      <div><span className="font-medium">Durum:</span> 
                        <span className={`ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedFranchise.status)}`}>
                          {selectedFranchise.status === 'active' ? 'Aktif' : 
                           selectedFranchise.status === 'inactive' ? 'Pasif' : 
                           selectedFranchise.status === 'suspended' ? 'Askıya Alınmış' : selectedFranchise.status}
                        </span>
                      </div>
                      <div><span className="font-medium">Aylık Royalty:</span> ₺{selectedFranchise.monthlyRoyalty}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Performans</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Performans Skoru:</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${selectedFranchise.performanceScore}%` }}
                          ></div>
                        </div>
                        <span>{selectedFranchise.performanceScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedFranchise.supportTickets && selectedFranchise.supportTickets.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Açık Destek Talepleri</h4>
                    <div className="space-y-2">
                      {selectedFranchise.supportTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{ticket.title}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority === 'urgent' ? 'Acil' :
                                   ticket.priority === 'high' ? 'Yüksek' :
                                   ticket.priority === 'medium' ? 'Orta' :
                                   ticket.priority === 'low' ? 'Düşük' : ticket.priority}
                                </span>
                                <span className="ml-2">
                                  {ticket.status === 'open' ? 'Açık' :
                                   ticket.status === 'in_progress' ? 'İşlemde' :
                                   ticket.status === 'resolved' ? 'Çözüldü' :
                                   ticket.status === 'closed' ? 'Kapalı' : ticket.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
                     </div>
         )}

         {/* Yeni Franchise Ekleme Modal */}
         {showAddFranchiseModal && (
           <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
             <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
               <div className="mt-3">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-medium text-gray-900">Yeni Franchise Ekle</h3>
                   <button
                     onClick={() => setShowAddFranchiseModal(false)}
                     className="text-gray-400 hover:text-gray-600"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
                 
                 <form onSubmit={createFranchise} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Franchise Adı *
                       </label>
                       <input
                         type="text"
                         value={franchiseForm.name}
                         onChange={(e) => setFranchiseForm({...franchiseForm, name: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         required
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Franchise Kodu *
                       </label>
                       <input
                         type="text"
                         value={franchiseForm.code}
                         onChange={(e) => setFranchiseForm({...franchiseForm, code: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         placeholder="FR001"
                         required
                       />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Sahip Adı *
                       </label>
                       <input
                         type="text"
                         value={franchiseForm.ownerName}
                         onChange={(e) => setFranchiseForm({...franchiseForm, ownerName: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         required
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Sahip E-posta *
                       </label>
                       <input
                         type="email"
                         value={franchiseForm.ownerEmail}
                         onChange={(e) => setFranchiseForm({...franchiseForm, ownerEmail: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         required
                       />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Sahip Telefon
                       </label>
                       <input
                         type="tel"
                         value={franchiseForm.ownerPhone}
                         onChange={(e) => setFranchiseForm({...franchiseForm, ownerPhone: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Aylık Royalty (₺)
                       </label>
                       <input
                         type="number"
                         value={franchiseForm.monthlyRoyalty}
                         onChange={(e) => setFranchiseForm({...franchiseForm, monthlyRoyalty: parseFloat(e.target.value) || 0})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         min="0"
                         step="0.01"
                       />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Şehir *
                       </label>
                       <input
                         type="text"
                         value={franchiseForm.city}
                         onChange={(e) => setFranchiseForm({...franchiseForm, city: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         required
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Anlaşma Tarihi *
                       </label>
                       <input
                         type="date"
                         value={franchiseForm.agreementDate}
                         onChange={(e) => setFranchiseForm({...franchiseForm, agreementDate: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                         required
                       />
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Adres *
                     </label>
                     <textarea
                       value={franchiseForm.address}
                       onChange={(e) => setFranchiseForm({...franchiseForm, address: e.target.value})}
                       rows={3}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                       required
                     />
                   </div>
                   
                   <div className="flex justify-end space-x-3 pt-4">
                     <button
                       type="button"
                       onClick={() => setShowAddFranchiseModal(false)}
                       className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                     >
                       İptal
                     </button>
                     <button
                       type="submit"
                       className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                     >
                       Franchise Oluştur
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