'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

export default function EmailTestPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestEmail = async () => {
    if (!email) {
      toast.error('Email adresi gerekli');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Test email başarıyla gönderildi!');
        setResult(data);
      } else {
        toast.error(data.error || 'Email gönderilemedi');
        setResult(data);
      }
    } catch (error) {
      console.error('Email test hatası:', error);
      toast.error('Email test hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📧 Email Test Sayfası</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Ayarlarını Test Et</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Test Email Adresi
                </label>
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleTestEmail} 
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? 'Gönderiliyor...' : 'Test Email Gönder'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Sonucu</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Email Kurulum Rehberi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">1. Gmail App Password Oluşturma</h3>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Google Hesabınıza gidin: <a href="https://myaccount.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">myaccount.google.com</a></li>
                  <li>"Güvenlik" sekmesine tıklayın</li>
                  <li>"2 Adımlı Doğrulama"yı etkinleştirin</li>
                  <li>"Uygulama Şifreleri" bölümüne gidin</li>
                  <li>"Uygulama Seç" &gt; "Diğer (Özel ad)" &gt; "Yemek5" yazın</li>
                  <li>Oluşturulan 16 haneli şifreyi kopyalayın</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Environment Variables Ayarlama</h3>
                <p className="mb-2">Backend klasöründeki <code className="bg-gray-100 px-1 rounded">.env</code> dosyasına ekleyin:</p>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{`EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PANEL_URL=https://yourdomain.com/admin`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Production Ortamında</h3>
                <p>Render veya diğer hosting platformlarında environment variables bölümüne yukarıdaki değişkenleri ekleyin.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 