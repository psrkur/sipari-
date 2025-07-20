# 🏢 Multi-Tenant Sistem Kullanım Kılavuzu

## 📋 Genel Bakış

Bu sistem artık çoklu firma desteği ile çalışmaktadır. Her firmanın kendi:
- Süper admini
- Şubeleri
- Kullanıcıları
- Ürünleri
- Siparişleri
- Müşterileri

bulunmaktadır.

## 🏗️ Sistem Mimarisi

### **Rol Hiyerarşisi:**

1. **SUPER_ADMIN** - Tüm firmalara erişim
2. **COMPANY_ADMIN** - Kendi firmasına tam erişim
3. **BRANCH_MANAGER** - Belirli şubeye erişim
4. **CUSTOMER** - Sadece sipariş verebilir

### **Veri İzolasyonu:**

Her veri kaydı `companyId` ile ilişkilendirilir ve kullanıcılar sadece kendi firmalarının verilerini görebilir.

## 🚀 Kurulum Adımları

### **1. Veritabanı Şemasını Güncelle**

```bash
# Yeni şemayı kullan
cp backend/prisma/schema-multi-tenant.prisma backend/prisma/schema.prisma

# Veritabanını güncelle
cd backend
npx prisma migrate dev --name multi-tenant
npx prisma generate
```

### **2. Backend'i Yeniden Başlat**

```bash
cd backend
npm run dev
```

### **3. Firma Yönetimi Sayfasına Erişim**

```
http://localhost:3000/company-management
```

## 📝 Kullanım Örnekleri

### **Firma Oluşturma:**

1. **Firma Yönetimi** sayfasına git
2. **"Yeni Firma Ekle"** butonuna tıkla
3. Firma bilgilerini doldur:
   - **Firma Adı:** Pizza House
   - **Domain:** pizzahouse
   - **Telefon:** +90 555 123 4567
   - **Email:** info@pizzahouse.com
   - **Adres:** Merkez Mahallesi, No:123

4. **"Firma Oluştur"** butonuna tıkla

### **Oluşturulan Hesap Bilgileri:**

```
👑 Firma Admin: admin@pizzahouse.com / admin123
🏢 Merkez Şube: Otomatik oluşturulur
📦 Varsayılan Kategoriler: Pizzalar, İçecekler, Tatlılar
```

### **Firma Girişi:**

1. **Giriş yap** sayfasına git
2. **Email:** admin@pizzahouse.com
3. **Şifre:** admin123
4. **Giriş yap**

## 🔧 API Endpoint'leri

### **Firma Yönetimi:**

```javascript
// Firma oluştur
POST /api/companies
{
  "name": "Pizza House",
  "domain": "pizzahouse",
  "logo": "https://example.com/logo.png",
  "address": "Merkez Mahallesi, No:123",
  "phone": "+90 555 123 4567",
  "email": "info@pizzahouse.com"
}

// Firma listesi
GET /api/companies

// Firma detayı
GET /api/companies/:id

// Firma güncelle
PUT /api/companies/:id

// Firma sil
DELETE /api/companies/:id

// Firma istatistikleri
GET /api/companies/:id/stats
```

### **Firma Bazlı Veriler:**

```javascript
// Firma kullanıcıları
GET /api/admin/users (companyId otomatik filtrelenir)

// Firma şubeleri
GET /api/admin/branches (companyId otomatik filtrelenir)

// Firma ürünleri
GET /api/admin/products (companyId otomatik filtrelenir)

// Firma siparişleri
GET /api/admin/orders (companyId otomatik filtrelenir)
```

## 🛡️ Güvenlik

### **Veri İzolasyonu:**

- Her kullanıcı sadece kendi firmasının verilerini görebilir
- `companyId` otomatik olarak filtrelenir
- Firma dışı verilere erişim engellenir

### **Yetki Kontrolü:**

```javascript
// Süper admin - Tüm firmalara erişim
SUPER_ADMIN

// Firma admin - Kendi firmasına tam erişim
COMPANY_ADMIN

// Şube müdürü - Belirli şubeye erişim
BRANCH_MANAGER

// Müşteri - Sadece sipariş verebilir
CUSTOMER
```

## 📊 Örnek Firma Senaryoları

### **Senaryo 1: Pizza House**

```
🏢 Firma: Pizza House
👑 Admin: admin@pizzahouse.com
🏢 Şubeler: Merkez Şube, Kadıköy Şube
📦 Kategoriler: Pizzalar, İçecekler, Tatlılar
👥 Kullanıcılar: 5 kullanıcı
📊 Siparişler: 150 sipariş/ay
```

### **Senaryo 2: Burger King**

```
🏢 Firma: Burger King
👑 Admin: admin@burgerking.com
🏢 Şubeler: Merkez Şube, Beşiktaş Şube, Şişli Şube
📦 Kategoriler: Burgerler, İçecekler, Yan Ürünler
👥 Kullanıcılar: 8 kullanıcı
📊 Siparişler: 300 sipariş/ay
```

### **Senaryo 3: Dönerci**

```
🏢 Firma: Lezzet Döner
👑 Admin: admin@lezzetdoner.com
🏢 Şubeler: Merkez Şube
📦 Kategoriler: Dönerler, İçecekler, Tatlılar
👥 Kullanıcılar: 3 kullanıcı
📊 Siparişler: 80 sipariş/ay
```

## 🔄 Geçiş Adımları

### **Mevcut Sistemi Multi-Tenant'a Geçirme:**

1. **Veritabanı yedekle**
2. **Yeni şemayı uygula**
3. **Varsayılan firma oluştur**
4. **Mevcut verileri yeni firmaya taşı**
5. **Test et ve yayınla**

### **Yeni Firma Ekleme:**

1. **Firma Yönetimi** sayfasına git
2. **Yeni Firma Ekle** butonuna tıkla
3. **Firma bilgilerini doldur**
4. **Oluştur** butonuna tıkla
5. **Admin bilgilerini not al**

## 📈 Avantajlar

### **Firma İçin:**
- ✅ Kendi verilerine tam kontrol
- ✅ Bağımsız yönetim
- ✅ Özelleştirilebilir ayarlar
- ✅ Güvenli veri izolasyonu

### **Sistem Yöneticisi İçin:**
- ✅ Merkezi yönetim
- ✅ Tüm firmaları tek yerden izleme
- ✅ Kolay bakım ve güncelleme
- ✅ Ölçeklenebilir yapı

## 🚨 Önemli Notlar

1. **Domain benzersizliği:** Her firmanın benzersiz domain'i olmalı
2. **Veri izolasyonu:** Firmalar birbirinin verilerini göremez
3. **Yedekleme:** Düzenli veritabanı yedeklemesi yapın
4. **Güvenlik:** JWT token'ları firma bilgisi içerir
5. **Performans:** Büyük firmalar için ayrı veritabanı düşünülebilir

## 🆘 Sorun Giderme

### **Sık Karşılaşılan Sorunlar:**

1. **"Firma bilgisi bulunamadı" hatası**
   - Kullanıcının `companyId` alanı boş olabilir
   - Kullanıcıyı yeniden oluşturun

2. **"Domain zaten kullanılıyor" hatası**
   - Farklı bir domain adı seçin

3. **Veri görünmüyor**
   - Kullanıcının doğru firmaya atandığını kontrol edin

4. **Yetki hatası**
   - Kullanıcının rolünü kontrol edin

## 📞 Destek

Sorun yaşarsanız:
1. **Console loglarını kontrol edin**
2. **Veritabanı bağlantısını test edin**
3. **Kullanıcı yetkilerini kontrol edin**
4. **Firma durumunu kontrol edin** 