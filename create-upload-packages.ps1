# GüzelHosting'e Yüklenecek Dosyaları Zip Paketleri Halinde Hazırlama
# =====================================================================

Write-Host "🔄 GüzelHosting upload paketleri hazırlanıyor..." -ForegroundColor Green

# Geçici klasör oluştur
$tempDir = "guzelhosting-upload"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir

# 1. Backend Paketi
Write-Host "📦 Backend paketi hazırlanıyor..." -ForegroundColor Yellow
$backendDir = "$tempDir/backend"
New-Item -ItemType Directory -Path $backendDir

# Backend dosyalarını kopyala
Copy-Item "backend/server.js" -Destination "$backendDir/"
Copy-Item "backend/package.json" -Destination "$backendDir/"
Copy-Item "backend/prisma" -Destination "$backendDir/" -Recurse
Copy-Item "backend/middleware" -Destination "$backendDir/" -Recurse
Copy-Item "backend/utils" -Destination "$backendDir/" -Recurse
Copy-Item "backend/integrations" -Destination "$backendDir/" -Recurse
Copy-Item "backend/uploads" -Destination "$backendDir/" -Recurse -ErrorAction SilentlyContinue

# Veritabanı yedek dosyasını kopyala
Copy-Item "backend/backups/database-backup.zip" -Destination "$backendDir/"

# Backend zip oluştur
Compress-Archive -Path "$backendDir/*" -DestinationPath "backend-package.zip" -Force
Write-Host "✅ Backend paketi oluşturuldu: backend-package.zip" -ForegroundColor Green

# 2. Frontend Paketi
Write-Host "📦 Frontend paketi hazırlanıyor..." -ForegroundColor Yellow
$frontendDir = "$tempDir/frontend"
New-Item -ItemType Directory -Path $frontendDir

# Frontend dosyalarını kopyala
Copy-Item "frontend/package.json" -Destination "$frontendDir/"
Copy-Item "frontend/next.config.js" -Destination "$frontendDir/"
Copy-Item "frontend/tailwind.config.js" -Destination "$frontendDir/"
Copy-Item "frontend/tsconfig.json" -Destination "$frontendDir/"
Copy-Item "frontend/app" -Destination "$frontendDir/" -Recurse
Copy-Item "frontend/components" -Destination "$frontendDir/" -Recurse
Copy-Item "frontend/lib" -Destination "$frontendDir/" -Recurse
Copy-Item "frontend/store" -Destination "$frontendDir/" -Recurse
Copy-Item "frontend/hooks" -Destination "$frontendDir/" -Recurse

# Frontend zip oluştur
Compress-Archive -Path "$frontendDir/*" -DestinationPath "frontend-package.zip" -Force
Write-Host "✅ Frontend paketi oluşturuldu: frontend-package.zip" -ForegroundColor Green

# 3. Ana Proje Paketi
Write-Host "📦 Ana proje paketi hazırlanıyor..." -ForegroundColor Yellow
$mainDir = "$tempDir/main"
New-Item -ItemType Directory -Path $mainDir

# Ana proje dosyalarını kopyala
Copy-Item "package.json" -Destination "$mainDir/"
Copy-Item "deploy.sh" -Destination "$mainDir/"
Copy-Item "render.yaml" -Destination "$mainDir/"

# Ana proje zip oluştur
Compress-Archive -Path "$mainDir/*" -DestinationPath "main-package.zip" -Force
Write-Host "✅ Ana proje paketi oluşturuldu: main-package.zip" -ForegroundColor Green

# 4. Veritabanı Paketi (Ayrı)
Write-Host "📦 Veritabanı paketi hazırlanıyor..." -ForegroundColor Yellow
Copy-Item "backend/backups/database-backup.zip" -Destination "database-package.zip"
Write-Host "✅ Veritabanı paketi oluşturuldu: database-package.zip" -ForegroundColor Green

# 5. Tüm Paketleri Birleştir
Write-Host "📦 Tüm paketleri birleştiriyor..." -ForegroundColor Yellow
$allPackagesDir = "$tempDir/all-packages"
New-Item -ItemType Directory -Path $allPackagesDir

Copy-Item "backend-package.zip" -Destination "$allPackagesDir/"
Copy-Item "frontend-package.zip" -Destination "$allPackagesDir/"
Copy-Item "main-package.zip" -Destination "$allPackagesDir/"
Copy-Item "database-package.zip" -Destination "$allPackagesDir/"

# README dosyası oluştur
$readmeContent = @"
# GüzelHosting Upload Paketleri
# =============================

## 📦 Paket İçerikleri

### 1. backend-package.zip
- Express.js sunucu dosyaları
- Prisma veritabanı şeması
- Middleware ve utils
- Entegrasyon dosyaları
- Veritabanı yedek dosyası

### 2. frontend-package.zip
- Next.js uygulama dosyaları
- React bileşenleri
- TypeScript konfigürasyonu
- Tailwind CSS ayarları

### 3. main-package.zip
- Ana proje konfigürasyonu
- Deploy scriptleri
- Render ayarları

### 4. database-package.zip
- Veritabanı yedek dosyası (25MB sıkıştırılmış)

## 🚀 Yükleme Adımları

1. **Backend Yükleme:**
   - backend-package.zip dosyasını çıkar
   - npm install çalıştır
   - .env dosyası oluştur

2. **Frontend Yükleme:**
   - frontend-package.zip dosyasını çıkar
   - npm install çalıştır
   - .env.local dosyası oluştur

3. **Veritabanı Kurulumu:**
   - database-package.zip dosyasını çıkar
   - MySQL veritabanı oluştur
   - Verileri import et

4. **Ana Proje:**
   - main-package.zip dosyasını çıkar
   - Gerekli ayarları yap

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

Oluşturulma Tarihi: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$readmeContent | Out-File -FilePath "$allPackagesDir/README.md" -Encoding UTF8

# Tüm paketleri zip'e al
Compress-Archive -Path "$allPackagesDir/*" -DestinationPath "guzelhosting-complete-package.zip" -Force

# Geçici klasörü temizle
Remove-Item $tempDir -Recurse -Force

Write-Host "🎉 Tüm paketler hazırlandı!" -ForegroundColor Green
Write-Host "📁 Oluşturulan dosyalar:" -ForegroundColor Cyan
Write-Host "   - backend-package.zip" -ForegroundColor White
Write-Host "   - frontend-package.zip" -ForegroundColor White
Write-Host "   - main-package.zip" -ForegroundColor White
Write-Host "   - database-package.zip" -ForegroundColor White
Write-Host "   - guzelhosting-complete-package.zip (Tüm paketler)" -ForegroundColor White

Write-Host "`n📋 Yükleme için guzelhosting-complete-package.zip dosyasını kullanın!" -ForegroundColor Yellow 