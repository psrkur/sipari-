# FastFood Hızlı Satış Uygulaması

Modern web tabanlı fastfood hızlı satış uygulaması. Kullanıcılar şube seçerek ürün siparişi verebilir, admin paneli ile sipariş takibi yapılabilir.

## Özellikler

### Kullanıcı Özellikleri
- ✅ Üyelik sistemi (kayıt/giriş)
- ✅ Zorunlu şube seçimi
- ✅ Ürün listesi ve sepet yönetimi
- ✅ Sipariş verme ve müşteri bilgileri
- ✅ Responsive tasarım

### Admin Özellikleri
- ✅ Sipariş takibi ve durum güncelleme
- ✅ Müşteri bilgileri görüntüleme
- ✅ Şube bazlı sipariş yönetimi

### Teknik Özellikler
- ✅ Node.js + Express.js backend
- ✅ Next.js + React frontend
- ✅ Prisma ORM ile SQLite veritabanı
- ✅ JWT tabanlı kimlik doğrulama
- ✅ TypeScript desteği
- ✅ Tailwind CSS ile modern UI

## Hızlı Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Otomatik Kurulum (Önerilen)

**Windows için:**
```bash
setup.bat
```

**Linux/Mac için:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manuel Kurulum

#### Adım 1: Bağımlılıkları yükleyin
```bash
npm run install:all
```

#### Adım 2: Backend kurulumu
```bash
cd backend
# .env dosyası oluşturun
cp env.example .env

# Veritabanını oluşturun
npx prisma migrate dev

# Seed data oluşturun (backend çalışırken)
curl -X POST http://localhost:3001/api/seed
```

#### Adım 3: Uygulamayı başlatın
```bash
# Ana dizinde
npm run dev
```

Bu komut hem backend (port 3001) hem de frontend (port 3000) uygulamalarını başlatacaktır.

## Kullanım

### Kullanıcı Girişi
- **Admin**: `admin@fastfood.com` / `admin123`
- **Normal kullanıcı**: Kayıt olarak yeni hesap oluşturabilirsiniz

### Sipariş Verme
1. Giriş yapın
2. Şube seçin
3. Ürünleri sepete ekleyin
4. Müşteri bilgilerini girin
5. Siparişi tamamlayın

### Admin Panel
- `/admin` sayfasından erişim
- Sipariş durumlarını güncelleyebilirsiniz
- Tüm siparişleri görüntüleyebilirsiniz

## API Endpoints

### Auth
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi

### Şubeler
- `GET /api/branches` - Şube listesi

### Ürünler
- `GET /api/products/:branchId` - Şube ürünleri

### Siparişler
- `POST /api/orders` - Sipariş oluşturma (auth gerekli)

### Admin
- `GET /api/admin/orders` - Tüm siparişler (admin gerekli)
- `PUT /api/admin/orders/:id/status` - Sipariş durumu güncelleme (admin gerekli)

## Veritabanı Şeması

### Tablolar
- **users**: Kullanıcı bilgileri
- **branches**: Şube bilgileri
- **products**: Ürün bilgileri
- **customers**: Müşteri bilgileri
- **orders**: Sipariş bilgileri
- **order_items**: Sipariş kalemleri

## Geliştirme

### Backend Geliştirme
```bash
cd backend
npm run dev
```

### Frontend Geliştirme
```bash
cd frontend
npm run dev
```

### Veritabanı Yönetimi
```bash
cd backend
npx prisma studio  # Veritabanı görsel arayüzü
npx prisma migrate dev  # Migration oluştur
npx prisma generate  # Client yenile
```

## Sorun Giderme

### TypeScript Hataları
Eğer TypeScript hataları alıyorsanız:
```bash
cd frontend
npm install
npm run build
```

### Veritabanı Sorunları
Veritabanını sıfırlamak için:
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

### Port Çakışması
Eğer portlar kullanımdaysa:
- Backend: `PORT=3002` (backend/.env dosyasında)
- Frontend: `npm run dev -- -p 3001` (frontend için)

## Teknolojiler

- **Backend**: Node.js, Express.js, Prisma, SQLite
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Auth**: JWT, bcryptjs
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Lisans

MIT License 