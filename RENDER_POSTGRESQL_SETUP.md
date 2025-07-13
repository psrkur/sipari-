# Render PostgreSQL Kurulum Rehberi

## 🚀 Hızlı Kurulum (Manuel)

### Adım 1: Render Dashboard'a Giriş
```bash
# Tarayıcıda açın
start https://dashboard.render.com
```

### Adım 2: PostgreSQL Veritabanı Oluşturma
1. **"New" butonuna tıklayın**
2. **"PostgreSQL" seçin**
3. **Ayar yapın:**
   - **Name:** `yemek5-database`
   - **Database:** `yemek5_db`
   - **User:** `yemek5_user`
   - **Region:** Frankfurt (Avrupa için)
   - **PostgreSQL Version:** 15

### Adım 3: Environment Variables Ekleme
Backend servisinizde şu environment variables'ları ekleyin:

```bash
# Key: DATABASE_URL
# Value: PostgreSQL'den aldığınız URL
# Örnek: postgresql://yemek5_user:password@host:port/yemek5_db

# Key: JWT_SECRET
# Value: your-super-secret-jwt-key-change-this-in-production

# Key: NODE_ENV
# Value: production

# Key: FRONTEND_URL
# Value: https://your-frontend-domain.com
```

## 🔧 Otomatik Kurulum Script'i

### PowerShell Script (Windows)
```powershell
# render-postgresql-setup.ps1
Write-Host "🚀 Render PostgreSQL Kurulum Script'i" -ForegroundColor Green

# PostgreSQL URL'sini al
$databaseUrl = Read-Host "PostgreSQL URL'sini girin (postgresql://user:password@host:port/database)"

# JWT Secret oluştur
$jwtSecret = -join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "📝 Environment Variables:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=$databaseUrl" -ForegroundColor Cyan
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Cyan
Write-Host "NODE_ENV=production" -ForegroundColor Cyan

Write-Host "✅ Bu değerleri Render Dashboard'da environment variables olarak ekleyin" -ForegroundColor Green
```

### Bash Script (Linux/Mac)
```bash
#!/bin/bash
# render-postgresql-setup.sh

echo "🚀 Render PostgreSQL Kurulum Script'i"

# PostgreSQL URL'sini al
read -p "PostgreSQL URL'sini girin (postgresql://user:password@host:port/database): " database_url

# JWT Secret oluştur
jwt_secret=$(openssl rand -base64 32)

echo "📝 Environment Variables:"
echo "DATABASE_URL=$database_url"
echo "JWT_SECRET=$jwt_secret"
echo "NODE_ENV=production"

echo "✅ Bu değerleri Render Dashboard'da environment variables olarak ekleyin"
```

## 🗄️ Veritabanı Test Script'i

### PostgreSQL Bağlantı Testi
```bash
# PostgreSQL'e bağlan
psql "postgresql://yemek5_user:password@host:port/yemek5_db"

# Test sorguları
SELECT version();
SELECT current_database();
SELECT current_user;

# Tabloları kontrol et
\dt

# Çıkış
\q
```

### Node.js Test Script'i
```javascript
// test-database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL bağlantısı başarılı');
    
    const userCount = await prisma.user.count();
    console.log(`📊 Kullanıcı sayısı: ${userCount}`);
    
    const branchCount = await prisma.branch.count();
    console.log(`📊 Şube sayısı: ${branchCount}`);
    
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

## 🔍 Sorun Giderme

### 1. Bağlantı Hatası
```bash
# Environment variable'ı kontrol et
echo $DATABASE_URL

# Prisma client'ı yeniden oluştur
npx prisma generate

# Veritabanı şemasını güncelle
npx prisma db push
```

### 2. Tablo Oluşturma Hatası
```bash
# Prisma migration'ları sıfırla
npx prisma migrate reset

# Yeni migration oluştur
npx prisma migrate dev --name init
```

### 3. Permission Hatası
```bash
# PostgreSQL kullanıcı yetkilerini kontrol et
psql "postgresql://yemek5_user:password@host:port/yemek5_db" -c "SELECT current_user, current_database();"
```

## 📊 Monitoring Komutları

### Veritabanı Durumu
```sql
-- Aktif bağlantıları görüntüle
SELECT * FROM pg_stat_activity;

-- Tablo boyutlarını görüntüle
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';

-- Slow query'leri bul
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 🚀 Deployment Checklist

- [ ] PostgreSQL veritabanı oluşturuldu
- [ ] DATABASE_URL environment variable eklendi
- [ ] JWT_SECRET environment variable eklendi
- [ ] NODE_ENV=production ayarlandı
- [ ] Backend servisi yeniden başlatıldı
- [ ] Health check endpoint'i test edildi
- [ ] API endpoint'leri test edildi

## 📈 Performance Optimizasyonu

### Connection Pooling
```javascript
// server.js'de Prisma client konfigürasyonu
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});
```

### Index'ler
```sql
-- Performans için index'ler
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "products_branchId_idx" ON "products"("branchId");
CREATE INDEX IF NOT EXISTS "orders_branchId_idx" ON "orders"("branchId");
```

## 🔒 Güvenlik

### SSL Bağlantısı
```bash
# PostgreSQL URL'sinde SSL parametresi ekle
postgresql://user:password@host:port/database?sslmode=require
```

### Güçlü Şifreler
```bash
# JWT Secret oluştur
openssl rand -base64 32

# PostgreSQL şifresi
# En az 12 karakter, büyük/küçük harf, sayı, özel karakter
```

Bu rehberi takip ederek Render'da PostgreSQL veritabanınızı güvenli bir şekilde kurabilirsiniz! 🎯 