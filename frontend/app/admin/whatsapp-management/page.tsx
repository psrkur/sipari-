'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  User, 
  Phone, 
  Settings, 
  CheckCircle, 
  TrendingUp,
  MessageSquare,
  Users,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

interface WhatsAppStats {
  totalClicks: number;
  successfulCommunication: number;
  averageResponseTime: number;
  last30Days: {
    totalClicks: number;
    successfulCommunication: number;
    averageResponseTime: number;
  };
}

interface QuickMessage {
  id: number;
  message: string;
  isActive: boolean;
}

export default function WhatsAppManagement() {
  const [stats, setStats] = useState<WhatsAppStats>({
    totalClicks: 1247,
    successfulCommunication: 89,
    averageResponseTime: 2.3,
    last30Days: {
      totalClicks: 1247,
      successfulCommunication: 89,
      averageResponseTime: 2.3
    }
  });
  const [whatsAppSettings, setWhatsAppSettings] = useState({
    phoneNumber: '+905322922609',
    defaultMessage: 'Merhaba! Sipariş vermek istiyorum.',
    isActive: true
  });
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([
    { id: 1, message: 'Merhaba! Sipariş vermek istiyorum.', isActive: true },
    { id: 2, message: 'Menü hakkında bilgi alabilir miyim?', isActive: true },
    { id: 3, message: 'Teslimat süresi ne kadar?', isActive: true }
  ]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingQuickMessage, setEditingQuickMessage] = useState<QuickMessage | null>(null);
  const { token } = useAuthStore();
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    loadWhatsAppSettings();
    fetchStats();
  }, []);

  const loadWhatsAppSettings = () => {
    try {
      console.log('🔍 WhatsApp ayarları yükleniyor...');
      
      const savedSettings = localStorage.getItem('whatsAppSettings');
      console.log('🔍 localStorage\'dan alınan veri:', savedSettings);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          console.log('🔍 Parse edilen ayarlar:', parsed);
          
          // Telefon numarasını temizle
          const cleanSettings = {
            ...parsed,
            phoneNumber: parsed.phoneNumber?.replace(/\D/g, '') || '905322922609'
          };
          
          console.log('🔍 Temizlenmiş ayarlar:', cleanSettings);
          setWhatsAppSettings(prev => ({ ...prev, ...cleanSettings }));
          
          console.log('✅ WhatsApp ayarları başarıyla yüklendi');
        } catch (error) {
          console.error('❌ WhatsApp ayarları parse edilemedi:', error);
          toast.error('WhatsApp ayarları yüklenemedi. Varsayılan değerler kullanılıyor.');
          
          // Varsayılan değerleri kullan
          const defaultSettings = {
            phoneNumber: '905322922609',
            defaultMessage: 'Merhaba! Sipariş vermek istiyorum.',
            isActive: true
          };
          setWhatsAppSettings(defaultSettings);
        }
      } else {
        console.log('⚠️ localStorage\'da WhatsApp ayarları bulunamadı, varsayılan değerler kullanılıyor');
        
        // Varsayılan değerleri kullan
        const defaultSettings = {
          phoneNumber: '905322922609',
          defaultMessage: 'Merhaba! Sipariş vermek istiyorum.',
          isActive: true
        };
        setWhatsAppSettings(defaultSettings);
        
        // Varsayılan ayarları localStorage'a kaydet
        localStorage.setItem('whatsAppSettings', JSON.stringify(defaultSettings));
        console.log('✅ Varsayılan ayarlar localStorage\'a kaydedildi');
      }
    } catch (error) {
      console.error('❌ WhatsApp ayarları yüklenirken genel hata:', error);
      toast.error('WhatsApp ayarları yüklenemedi. Lütfen sayfayı yenileyin.');
    }
  };

  const fetchStats = async () => {
    try {
      // Gerçek API çağrısı burada yapılacak
      // const response = await axios.get(`${API_BASE_URL}/api/whatsapp/stats`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setStats(response.data);
    } catch (error) {
      console.error('WhatsApp istatistikleri getirilemedi:', error);
    }
  };

  const updateWhatsAppSettings = (newSettings: typeof whatsAppSettings) => {
    try {
      console.log('🔍 WhatsApp ayarları güncelleniyor...');
      console.log('🔍 Yeni ayarlar:', newSettings);
      
      // Telefon numarasını temizle
      const cleanSettings = {
        ...newSettings,
        phoneNumber: newSettings.phoneNumber.replace(/\D/g, '')
      };
      
      console.log('🔍 Temizlenmiş ayarlar:', cleanSettings);
      
      // Ayarları state'e kaydet
      setWhatsAppSettings(cleanSettings);
      
      // localStorage'a kaydet
      localStorage.setItem('whatsAppSettings', JSON.stringify(cleanSettings));
      console.log('✅ Ayarlar localStorage\'a kaydedildi');
      
      // Ana sayfayı bilgilendir
      window.dispatchEvent(new CustomEvent('whatsAppSettingsChanged', {
        detail: { key: 'whatsAppSettings', value: cleanSettings }
      }));
      console.log('✅ Ana sayfa bilgilendirildi');
      
      toast.success('WhatsApp ayarları güncellendi!');
      setShowSettingsModal(false);
      
      console.log('✅ WhatsApp ayarları başarıyla güncellendi');
    } catch (error) {
      console.error('❌ WhatsApp ayarları güncellenirken hata:', error);
      toast.error('Ayarlar güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  const toggleWhatsAppStatus = () => {
    try {
      console.log('🔍 WhatsApp durumu değiştiriliyor...');
      console.log('🔍 Mevcut durum:', whatsAppSettings.isActive);
      
      const newSettings = { ...whatsAppSettings, isActive: !whatsAppSettings.isActive };
      console.log('🔍 Yeni durum:', newSettings.isActive);
      
      updateWhatsAppSettings(newSettings);
    } catch (error) {
      console.error('❌ WhatsApp durumu değiştirilirken hata:', error);
      toast.error('Durum değiştirilemedi. Lütfen tekrar deneyin.');
    }
  };

  const addQuickMessage = () => {
    const newMessage: QuickMessage = {
      id: Date.now(),
      message: '',
      isActive: true
    };
    setEditingQuickMessage(newMessage);
  };

  const saveQuickMessage = (message: QuickMessage) => {
    if (editingQuickMessage) {
      // Yeni mesaj ekleme
      setQuickMessages(prev => [...prev, { ...message, id: Date.now() }]);
    } else {
      // Mevcut mesajı güncelleme
      setQuickMessages(prev => prev.map(qm => qm.id === message.id ? message : qm));
    }
    setEditingQuickMessage(null);
    toast.success('Hızlı mesaj kaydedildi!');
  };

  const deleteQuickMessage = (id: number) => {
    setQuickMessages(prev => prev.filter(qm => qm.id !== id));
    toast.success('Hızlı mesaj silindi!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Mesaj panoya kopyalandı!');
  };

  // Telefon numarasını formatla
  const formatPhoneNumber = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('90')) {
      return `+${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10)}`;
    }
    return phone;
  };

  const testWhatsApp = () => {
    try {
      console.log('🧪 WhatsApp test başlatılıyor...');
      console.log('🔍 Mevcut ayarlar:', whatsAppSettings);
      
      // Ayarlar kontrolü
      if (!whatsAppSettings.phoneNumber) {
        toast.error('Telefon numarası bulunamadı. Lütfen önce ayarları kaydedin.');
        return;
      }
      
      if (!whatsAppSettings.defaultMessage) {
        toast.error('Varsayılan mesaj bulunamadı. Lütfen önce ayarları kaydedin.');
        return;
      }
      
      const phoneNumber = whatsAppSettings.phoneNumber.replace(/\D/g, '');
      const message = whatsAppSettings.defaultMessage;
      
      console.log('🔍 Temizlenmiş veriler:', { phoneNumber, message });
      
      // Telefon numarası kontrolü
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Geçersiz telefon numarası formatı. Lütfen geçerli bir numara girin.');
        console.error('❌ Geçersiz telefon numarası:', phoneNumber);
        return;
      }
      
      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      console.log('🧪 WhatsApp test ediliyor:', {
        phoneNumber: phoneNumber,
        message: message,
        url: url,
        originalPhoneNumber: whatsAppSettings.phoneNumber
      });
      
      // Önce toast göster
      toast.success('WhatsApp açılıyor...');
      
      // Sonra popup aç
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        console.log('✅ WhatsApp popup başarıyla açıldı');
        toast.success('WhatsApp test sayfası açıldı!');
      } else {
        console.error('❌ Popup engellendi');
        toast.error('Popup engellendi. Lütfen popup engelleyiciyi kapatın.');
      }
    } catch (error) {
      console.error('❌ WhatsApp test hatası:', error);
      toast.error('WhatsApp test edilemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Durum */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💬 WhatsApp Yönetimi</h1>
          <p className="text-gray-600 mt-1">Müşteriler ile iletişim kurulabilir</p>
        </div>
        <Button
          onClick={() => setShowSettingsModal(true)}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Ayarları Düzenle</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WhatsApp Durumu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp Durumu</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className={`h-5 w-5 ${whatsAppSettings.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${whatsAppSettings.isActive ? 'text-green-800' : 'text-gray-600'}`}>
                    WhatsApp {whatsAppSettings.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <Button
                  onClick={toggleWhatsAppStatus}
                  variant={whatsAppSettings.isActive ? "destructive" : "default"}
                  size="sm"
                >
                  {whatsAppSettings.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Telefon:</span>
                  <span className="text-sm font-medium">{formatPhoneNumber(whatsAppSettings.phoneNumber)}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Mesaj:</span>
                    <p className="text-sm font-medium mt-1">{whatsAppSettings.defaultMessage}</p>
                  </div>
                </div>
              </div>

              <Button onClick={testWhatsApp} className="w-full" variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp'ta Test Et ({formatPhoneNumber(whatsAppSettings.phoneNumber)})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* İstatistikler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>İstatistikler</span>
            </CardTitle>
            <p className="text-sm text-gray-600">Son 30 gün</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.last30Days.totalClicks.toLocaleString()}</div>
                <div className="text-sm text-blue-600">Toplam Tıklama</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.last30Days.successfulCommunication}%</div>
                <div className="text-sm text-green-600">Başarılı İletişim</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.last30Days.averageResponseTime} dk</div>
                <div className="text-sm text-orange-600">Ortalama Yanıt</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hızlı Mesajlar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Hızlı Mesajlar</span>
            </CardTitle>
            <p className="text-sm text-gray-600">Önceden tanımlanmış</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickMessages.map((message, index) => (
                <div key={message.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{message.message}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => copyToClipboard(message.message)}
                      size="sm"
                      variant="outline"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setEditingQuickMessage(message)}
                      size="sm"
                      variant="outline"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button onClick={addQuickMessage} className="w-full" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Yeni Hızlı Mesaj Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ayarlar Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">WhatsApp Ayarları</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Telefon Numarası
                </label>
                <Input
                  value={formatPhoneNumber(whatsAppSettings.phoneNumber)}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/\D/g, '');
                    setWhatsAppSettings(prev => ({ ...prev, phoneNumber: cleanValue }));
                  }}
                  placeholder="+90532 292 2609"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varsayılan Mesaj
                </label>
                <Textarea
                  value={whatsAppSettings.defaultMessage}
                  onChange={(e) => setWhatsAppSettings(prev => ({ ...prev, defaultMessage: e.target.value }))}
                  placeholder="Merhaba! Sipariş vermek istiyorum."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex space-x-2 mt-6">
              <Button onClick={() => updateWhatsAppSettings(whatsAppSettings)} className="flex-1">
                Kaydet
              </Button>
              <Button onClick={() => setShowSettingsModal(false)} variant="outline" className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Mesaj Düzenleme Modal */}
      {editingQuickMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingQuickMessage.id > 3 ? 'Yeni Hızlı Mesaj' : 'Hızlı Mesaj Düzenle'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mesaj
                </label>
                <Textarea
                  value={editingQuickMessage.message}
                  onChange={(e) => setEditingQuickMessage(prev => prev ? { ...prev, message: e.target.value } : null)}
                  placeholder="Mesajınızı yazın..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={() => saveQuickMessage(editingQuickMessage)} 
                className="flex-1"
                disabled={!editingQuickMessage.message.trim()}
              >
                Kaydet
              </Button>
              <Button 
                onClick={() => setEditingQuickMessage(null)} 
                variant="outline" 
                className="flex-1"
              >
                İptal
              </Button>
              {editingQuickMessage.id > 3 && (
                <Button 
                  onClick={() => deleteQuickMessage(editingQuickMessage.id)} 
                  variant="destructive"
                >
                  Sil
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
