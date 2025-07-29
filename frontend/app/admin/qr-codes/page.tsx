'use client';

import { useState, useEffect } from 'react';
import { Download, Printer, QrCode, Building, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../../../store/auth';

interface Branch {
  id: number;
  name: string;
  address: string;
}

interface QRCodeData {
  branchId: number;
  branchName: string;
  branchAddress: string;
  qrUrl: string;
  qrCodeDataUrl: string;
  generatedAt: string;
}

export default function QRCodesPage() {
  const { user, token } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
    fetchQRCodes();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch('https://yemek5-backend.onrender.com/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Şubeler yüklenemedi:', error);
    }
  };

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://yemek5-backend.onrender.com/api/admin/qr-codes/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodes(data);
      }
    } catch (error) {
      console.error('QR kodlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (branchId: number) => {
    try {
      setGenerating(true);
      const response = await fetch('https://yemek5-backend.onrender.com/api/admin/qr-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ branchId })
      });

      if (response.ok) {
        const data = await response.json();
        // QR kodları yenile
        await fetchQRCodes();
        return data;
      }
    } catch (error) {
      console.error('QR kod oluşturulamadı:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Kopyalama başarısız:', error);
    }
  };

  const downloadQRCode = (qrCodeDataUrl: string, branchName: string) => {
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `${branchName}-qr-menu.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = (qrCodeDataUrl: string, branchName: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${branchName} - QR Menü</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
                margin: 0; 
              }
              .qr-container { 
                max-width: 400px; 
                margin: 0 auto; 
                padding: 20px; 
                border: 1px solid #ddd; 
                border-radius: 8px; 
              }
              .qr-code { 
                width: 300px; 
                height: 300px; 
                margin: 20px auto; 
              }
              .branch-name { 
                font-size: 18px; 
                font-weight: bold; 
                margin-bottom: 10px; 
              }
              .instructions { 
                font-size: 14px; 
                color: #666; 
                margin-top: 20px; 
              }
              @media print {
                body { margin: 0; }
                .qr-container { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="branch-name">${branchName}</div>
              <div class="instructions">QR Kodu Okutarak Menüyü Görüntüleyin</div>
              <img src="${qrCodeDataUrl}" alt="QR Menu" class="qr-code" />
              <div class="instructions">
                <p>📱 Telefonunuzla QR kodu tarayın</p>
                <p>🍽️ Menüyü görüntüleyin</p>
                <p>💳 Sipariş için kasadan yardım alın</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">QR kodlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <QrCode className="h-6 w-6 mr-2 text-blue-600" />
                QR Menü Yönetimi
              </h1>
              <p className="text-gray-600 mt-1">
                Şubeler için QR menü kodları oluşturun ve yazdırın
              </p>
            </div>
            <button
              onClick={() => fetchQRCodes()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Yenile
            </button>
          </div>
        </div>

        {/* Quick Generate */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı QR Kod Oluştur</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şube Seçin
              </label>
              <select
                value={selectedBranch || ''}
                onChange={(e) => setSelectedBranch(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Şube seçin...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => selectedBranch && generateQRCode(selectedBranch)}
              disabled={!selectedBranch || generating}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Kod Oluştur
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Codes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.branchId} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {qrCode.branchName}
                  </h3>
                  <p className="text-sm text-gray-600">{qrCode.branchAddress}</p>
                </div>
                <Building className="h-5 w-5 text-gray-400" />
              </div>

              {/* QR Code Image */}
              <div className="text-center mb-4">
                <img
                  src={qrCode.qrCodeDataUrl}
                  alt={`QR Menu - ${qrCode.branchName}`}
                  className="w-32 h-32 mx-auto border border-gray-200 rounded-lg"
                />
              </div>

              {/* URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menü URL'si
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrCode.qrUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(qrCode.qrUrl)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="URL'yi kopyala"
                  >
                    {copiedUrl === qrCode.qrUrl ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQRCode(qrCode.qrCodeDataUrl, qrCode.branchName)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  İndir
                </button>
                <button
                  onClick={() => printQRCode(qrCode.qrCodeDataUrl, qrCode.branchName)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Yazdır
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500 text-center">
                Oluşturulma: {new Date(qrCode.generatedAt).toLocaleDateString('tr-TR')}
              </div>
            </div>
          ))}
        </div>

        {qrCodes.length === 0 && (
          <div className="text-center py-12">
            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Kod Bulunamadı</h3>
            <p className="text-gray-600 mb-4">
              Henüz QR kod oluşturulmamış. Yukarıdaki formu kullanarak QR kod oluşturabilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 