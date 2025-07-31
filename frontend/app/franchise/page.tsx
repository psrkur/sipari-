"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { API_ENDPOINTS } from '../../lib/api';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Franchise {
  id: number;
  name: string;
  code: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  address: string;
  city: string;
  status: string;
  agreementDate: string;
  expiryDate?: string;
  monthlyRoyalty: number;
  performanceScore: number;
  branch?: {
    id: number;
    name: string;
    address: string;
  };
  supportTickets: any[];
  performanceReports: any[];
}

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
}

interface PerformanceReport {
  id: number;
  reportDate: string;
  monthlyRevenue: number;
  orderCount: number;
  customerCount: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  complianceScore: number;
  notes?: string;
}

export default function FranchisePage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'performance' | 'settings'>('overview');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium'
  });
  const [reportForm, setReportForm] = useState({
    reportDate: '',
    monthlyRevenue: '',
    orderCount: '',
    customerCount: '',
    averageOrderValue: '',
    customerSatisfaction: '',
    complianceScore: '',
    notes: ''
  });

  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }

    // Franchise sahibi kontrolü
    if (user.role !== 'SUPER_ADMIN' && !user.email.includes('franchise')) {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      router.push('/admin');
      return;
    }

    fetchFranchises();
  }, [user, token]);

  const fetchFranchises = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.FRANCHISES, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFranchises(response.data.franchises);
        
        // Eğer franchise sahibi ise, sadece kendi franchise'ını göster
        if (user.role !== 'SUPER_ADMIN') {
          const userFranchise = response.data.franchises.find(
            (f: Franchise) => f.ownerEmail === user.email
          );
          if (userFranchise) {
            setSelectedFranchise(userFranchise);
            fetchSupportTickets(userFranchise.id);
            fetchPerformanceReports(userFranchise.id);
          }
        }
      }
    } catch (error) {
      console.error('Franchise listesi alınamadı:', error);
      toast.error('Franchise listesi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportTickets = async (franchiseId: number) => {
    try {
      const response = await axios.get(API_ENDPOINTS.FRANCHISE_TICKETS(franchiseId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSupportTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Destek talepleri alınamadı:', error);
    }
  };

  const fetchPerformanceReports = async (franchiseId: number) => {
    try {
      const response = await axios.get(API_ENDPOINTS.FRANCHISE_REPORTS(franchiseId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPerformanceReports(response.data.reports);
      }
    } catch (error) {
      console.error('Performans raporları alınamadı:', error);
    }
  };

  const createSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise) return;

    try {
      const response = await axios.post(
        API_ENDPOINTS.CREATE_SUPPORT_TICKET(selectedFranchise.id),
        ticketForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Destek talebi oluşturuldu');
        setShowTicketModal(false);
        setTicketForm({ title: '', description: '', category: 'technical', priority: 'medium' });
        fetchSupportTickets(selectedFranchise.id);
      }
    } catch (error) {
      console.error('Destek talebi oluşturulamadı:', error);
      toast.error('Destek talebi oluşturulamadı');
    }
  };

  const createPerformanceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise) return;

    try {
      const response = await axios.post(
        API_ENDPOINTS.CREATE_PERFORMANCE_REPORT(selectedFranchise.id),
        reportForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Performans raporu oluşturuldu');
        setShowReportModal(false);
        setReportForm({
          reportDate: '',
          monthlyRevenue: '',
          orderCount: '',
          customerCount: '',
          averageOrderValue: '',
          customerSatisfaction: '',
          complianceScore: '',
          notes: ''
        });
        fetchPerformanceReports(selectedFranchise.id);
      }
    } catch (error) {
      console.error('Performans raporu oluşturulamadı:', error);
      toast.error('Performans raporu oluşturulamadı');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-red-600';
      case 'suspended': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Franchise Yönetimi</h1>
          <p className="mt-2 text-gray-600">
            {user.role === 'SUPER_ADMIN' ? 'Tüm franchise\'ları yönetin' : 'Franchise bilgilerinizi görüntüleyin'}
          </p>
        </div>

        {/* Franchise Seçimi (Sadece SUPER_ADMIN için) */}
        {user.role === 'SUPER_ADMIN' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Franchise Seçin
            </label>
            <select
              value={selectedFranchise?.id || ''}
              onChange={(e) => {
                const franchise = franchises.find(f => f.id === parseInt(e.target.value));
                setSelectedFranchise(franchise || null);
                if (franchise) {
                  fetchSupportTickets(franchise.id);
                  fetchPerformanceReports(franchise.id);
                }
              }}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Franchise seçin...</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name} ({franchise.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Seçili Franchise Bilgileri */}
        {selectedFranchise && (
          <>
            {/* Franchise Bilgileri Kartı */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Franchise Bilgileri</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Franchise Adı:</span>
                      <p className="text-gray-900">{selectedFranchise.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Kod:</span>
                      <p className="text-gray-900">{selectedFranchise.code}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Sahip:</span>
                      <p className="text-gray-900">{selectedFranchise.ownerName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">E-posta:</span>
                      <p className="text-gray-900">{selectedFranchise.ownerEmail}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Telefon:</span>
                      <p className="text-gray-900">{selectedFranchise.ownerPhone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Adres:</span>
                      <p className="text-gray-900">{selectedFranchise.address}, {selectedFranchise.city}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Durum:</span>
                      <p className={`${getStatusColor(selectedFranchise.status)}`}>
                        {selectedFranchise.status === 'active' ? 'Aktif' : 
                         selectedFranchise.status === 'inactive' ? 'Pasif' : 'Askıya Alınmış'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Aylık Royalty:</span>
                      <p className="text-gray-900">₺{selectedFranchise.monthlyRoyalty}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Performans Skoru:</span>
                      <p className="text-gray-900">{selectedFranchise.performanceScore}%</p>
                    </div>
                  </div>
                </div>

                {selectedFranchise.branch && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Şube Bilgileri</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Şube Adı:</span>
                        <p className="text-gray-900">{selectedFranchise.branch.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Şube Adresi:</span>
                        <p className="text-gray-900">{selectedFranchise.branch.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sözleşme Bilgileri</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Sözleşme Tarihi:</span>
                      <p className="text-gray-900">{formatDate(selectedFranchise.agreementDate)}</p>
                    </div>
                    {selectedFranchise.expiryDate && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Bitiş Tarihi:</span>
                        <p className="text-gray-900">{formatDate(selectedFranchise.expiryDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Genel Bakış' },
                  { id: 'tickets', name: 'Destek Talepleri' },
                  { id: 'performance', name: 'Performans Raporları' },
                  { id: 'settings', name: 'Ayarlar' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Genel Bakış</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900">Açık Destek Talepleri</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {supportTickets.filter(t => t.status === 'open').length}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900">Performans Raporları</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {performanceReports.length}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900">Performans Skoru</h4>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedFranchise.performanceScore}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tickets' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Destek Talepleri</h3>
                    <button
                      onClick={() => setShowTicketModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Yeni Talep Oluştur
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{ticket.title}</h4>
                            <p className="text-gray-600 mt-1">{ticket.description}</p>
                            <div className="flex space-x-4 mt-2 text-sm">
                              <span className={`${getPriorityColor(ticket.priority)}`}>
                                Öncelik: {ticket.priority}
                              </span>
                              <span className="text-gray-500">
                                Kategori: {ticket.category}
                              </span>
                              <span className="text-gray-500">
                                {formatDate(ticket.createdAt)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status === 'open' ? 'Açık' :
                             ticket.status === 'in_progress' ? 'İşlemde' : 'Çözüldü'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Performans Raporları</h3>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Yeni Rapor Oluştur
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {performanceReports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Rapor Tarihi</span>
                            <p className="text-gray-900">{formatDate(report.reportDate)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Aylık Gelir</span>
                            <p className="text-gray-900">₺{report.monthlyRevenue}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Sipariş Sayısı</span>
                            <p className="text-gray-900">{report.orderCount}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Müşteri Sayısı</span>
                            <p className="text-gray-900">{report.customerCount}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Ortalama Sipariş</span>
                            <p className="text-gray-900">₺{report.averageOrderValue}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Müşteri Memnuniyeti</span>
                            <p className="text-gray-900">{report.customerSatisfaction}%</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Uyum Skoru</span>
                            <p className="text-gray-900">{report.complianceScore}%</p>
                          </div>
                        </div>
                        {report.notes && (
                          <div className="mt-4">
                            <span className="text-sm font-medium text-gray-500">Notlar</span>
                            <p className="text-gray-900 mt-1">{report.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ayarlar</h3>
                  <p className="text-gray-600">Franchise ayarları burada görüntülenecek.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modals */}
        {showTicketModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Destek Talebi</h3>
                <form onSubmit={createSupportTicket}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Başlık</label>
                      <input
                        type="text"
                        value={ticketForm.title}
                        onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="technical">Teknik</option>
                        <option value="menu">Menü</option>
                        <option value="training">Eğitim</option>
                        <option value="equipment">Ekipman</option>
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Öncelik</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowTicketModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Performans Raporu</h3>
                <form onSubmit={createPerformanceReport}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rapor Tarihi</label>
                      <input
                        type="date"
                        value={reportForm.reportDate}
                        onChange={(e) => setReportForm({...reportForm, reportDate: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Aylık Gelir (₺)</label>
                      <input
                        type="number"
                        value={reportForm.monthlyRevenue}
                        onChange={(e) => setReportForm({...reportForm, monthlyRevenue: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sipariş Sayısı</label>
                      <input
                        type="number"
                        value={reportForm.orderCount}
                        onChange={(e) => setReportForm({...reportForm, orderCount: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Müşteri Sayısı</label>
                      <input
                        type="number"
                        value={reportForm.customerCount}
                        onChange={(e) => setReportForm({...reportForm, customerCount: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ortalama Sipariş (₺)</label>
                      <input
                        type="number"
                        value={reportForm.averageOrderValue}
                        onChange={(e) => setReportForm({...reportForm, averageOrderValue: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Müşteri Memnuniyeti (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={reportForm.customerSatisfaction}
                        onChange={(e) => setReportForm({...reportForm, customerSatisfaction: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Uyum Skoru (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={reportForm.complianceScore}
                        onChange={(e) => setReportForm({...reportForm, complianceScore: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notlar</label>
                      <textarea
                        value={reportForm.notes}
                        onChange={(e) => setReportForm({...reportForm, notes: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Oluştur
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