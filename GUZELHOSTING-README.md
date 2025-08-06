# GüzelHosting Upload Paketleri
# =============================

## 📦 Paket İçerikleri

### 1. backend-package.zip (55KB)
- Express.js sunucu dosyaları
- Prisma veritabanı şeması
- Middleware ve utils
- Entegrasyon dosyaları

### 2. frontend-package.zip (148KB)
- Next.js uygulama dosyaları
- React bileşenleri
- TypeScript konfigürasyonu
- Tailwind CSS ayarları

### 3. main-package.zip (3.4KB)
- Ana proje konfigürasyonu
- Deploy scriptleri
- Render ayarları

### 4. database-package.zip (19MB)
- Veritabanı yedek dosyası (25MB sıkıştırılmış)
- Tüm tablo verileri JSON formatında

### 5. guzelhosting-complete-package.zip
- Tüm paketleri içeren ana paket

## 🚀 Yükleme Adımları

### 1. Backend Kurulumu
```bash
# backend-package.zip dosyasını çıkar
unzip backend-package.zip

# Bağımlılıkları yükle
npm install

# Environment dosyası oluştur
cat > .env << EOF
DATABASE_URL="mysql://kullanici:sifre@guzelhosting_host:3306/veritabani"
JWT_SECRET="your-jwt-secret-key"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
NODE_ENV="production"
EOF

# Prisma schema'yı MySQL'e çevir
# prisma/schema.prisma dosyasında:
# datasource db {
#   provider = "mysql"
#   url      = env("DATABASE_URL")
# }

# Prisma client oluştur
npx prisma generate

# Migration çalıştır
npx prisma migrate deploy
```

### 2. Frontend Kurulumu
```bash
# frontend-package.zip dosyasını çıkar
unzip frontend-package.zip

# Bağımlılıkları yükle
npm install

# Environment dosyası oluştur
cat > .env.local << EOF
NEXT_PUBLIC_API_URL="https://your-domain.com"
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"
EOF

# Build al
npm run build
```

### 3. Veritabanı Kurulumu
```bash
# database-package.zip dosyasını çıkar
unzip database-package.zip

# Veritabanı verilerini import et
# database-backup.zip içindeki JSON dosyasını kullan
```

### 4. Ana Proje
```bash
# main-package.zip dosyasını çıkar
unzip main-package.zip

# Gerekli ayarları yap
```

## ⚙️ Environment Dosyaları

### Backend (.env)
```env
DATABASE_URL="mysql://kullanici:sifre@guzelhosting_host:3306/veritabani"
JWT_SECRET="your-jwt-secret-key"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
NODE_ENV="production"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="https://your-domain.com"
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"
```

## 📋 Yükleme Sırası
1. Backend paketini yükle ve kur
2. Frontend paketini yükle ve kur
3. Ana proje paketini yükle
4. Veritabanı paketini çıkar ve import et
5. Environment dosyalarını oluştur
6. Uygulamayı başlat

## 🔧 GüzelHosting Gereksinimleri
- Node.js 18+
- MySQL 8.0+
- PHP 8.1+
- SSL sertifikası
- Domain yönlendirmesi

## 📊 Veritabanı İstatistikleri
- Toplam Tablo: 14
- Toplam Kayıt: 101
- Dosya Boyutu: 25.37 MB (sıkıştırılmış: 19MB)

## 🎯 Önemli Notlar
- node_modules/ klasörünü yüklemeyin
- .env dosyalarını güvenlik için ayrı oluşturun
- Prisma schema'yı MySQL'e çevirmeyi unutmayın
- Veritabanı yedek dosyası: database-backup.zip

Oluşturulma Tarihi: 2025-08-06 18:20:00 