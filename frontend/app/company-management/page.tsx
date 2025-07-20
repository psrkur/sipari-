'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Company {
  id: number;
  name: string;
  domain: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    branches: number;
    products: number;
    orders: number;
  };
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    logo: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Firma listesi alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Firma başarıyla oluşturuldu!\n\nAdmin Bilgileri:\nEmail: ${result.admin.email}\nŞifre: ${result.admin.password}`);
        setShowCreateForm(false);
        setFormData({
          name: '',
          domain: '',
          logo: '',
          address: '',
          phone: '',
          email: ''
        });
        fetchCompanies();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Firma oluşturma hatası:', error);
      alert('Firma oluşturulurken hata oluştu');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Bu firmayı ve tüm verilerini silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Firma başarıyla silindi');
        fetchCompanies();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Firma silme hatası:', error);
      alert('Firma silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Firma Yönetimi</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'İptal' : 'Yeni Firma Ekle'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Yeni Firma Oluştur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Firma Adı *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: Pizza House"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Domain *</label>
                  <Input
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    placeholder="Örn: pizzahouse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Logo URL</label>
                  <Input
                    value={formData.logo}
                    onChange={(e) => setFormData({...formData, logo: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telefon</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+90 555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="info@pizzahouse.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Adres</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Merkez Mahallesi, No:123"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Firma Oluştur</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{company.name}</CardTitle>
                  <p className="text-sm text-gray-600">@{company.domain}</p>
                </div>
                <Badge variant={company.isActive ? "default" : "secondary"}>
                  {company.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Kullanıcılar:</span>
                  <span className="font-medium">{company._count.users}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Şubeler:</span>
                  <span className="font-medium">{company._count.branches}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ürünler:</span>
                  <span className="font-medium">{company._count.products}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Siparişler:</span>
                  <span className="font-medium">{company._count.orders}</span>
                </div>
                
                {company.phone && (
                  <div className="text-sm text-gray-600">
                    📞 {company.phone}
                  </div>
                )}
                
                {company.email && (
                  <div className="text-sm text-gray-600">
                    📧 {company.email}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Oluşturulma: {new Date(company.createdAt).toLocaleDateString('tr-TR')}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Düzenle
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleDeleteCompany(company.id)}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Henüz firma bulunmuyor.</p>
          <Button onClick={() => setShowCreateForm(true)} className="mt-4">
            İlk Firmayı Oluştur
          </Button>
        </div>
      )}
    </div>
  );
} 