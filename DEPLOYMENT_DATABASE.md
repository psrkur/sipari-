# Render'da Veritabanı Oluşturma Rehberi

## 1. Render PostgreSQL Veritabanı (Önerilen)

### Adım 1: Render Dashboard'a Giriş
1. https://render.com adresine gidin
2. GitHub hesabınızla giriş yapın

### Adım 2: PostgreSQL Veritabanı Oluşturma
1. Dashboard'da "New" butonuna tıklayın
2. "PostgreSQL" seçin
3. Veritabanı ayarları:
   - **Name**: `yemek5-database` (veya istediğiniz isim)
   - **Database**: `yemek5_db`
   - **User**: `yemek5_user`
   - **Region**: En yakın bölgeyi seçin (Avrupa için Frankfurt)
   - **PostgreSQL Version**: 15 (en son kararlı sürüm)

### Adım 3: Veritabanı Bağlantı Bilgilerini Alma
1. Veritabanı oluşturulduktan sonra "Connect" sekmesine gidin
2. "External Database URL" kopyalayın
3. Bu URL şuna benzer olacak:
   ```
   postgresql://yemek5_user:password@host:port/yemek5_db
   ```

### Adım 4: Environment Variables Ayarlama
1. Backend servisinizin "Environment" sekmesine gidin
2. "Environment Variables" bölümüne şunu ekleyin:
   - **Key**: `DATABASE_URL`
   - **Value**: Kopyaladığınız PostgreSQL URL'si

### Adım 5: Veritabanı Şemasını Oluşturma
1. Backend servisinizin "Logs" sekmesine gidin
2. Servisi yeniden başlatın
3. Logları kontrol edin - otomatik tablo oluşturma çalışacak

## 2. Alternatif: Kendi Sunucunuzda PostgreSQL

### Adım 1: Sunucu Hazırlığı
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql postgresql-server
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Adım 2: Veritabanı Oluşturma
```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Veritabanı ve kullanıcı oluştur
CREATE DATABASE yemek5_db;
CREATE USER yemek5_user WITH PASSWORD 'güvenli_şifre';
GRANT ALL PRIVILEGES ON DATABASE yemek5_db TO yemek5_user;
\q
```

### Adım 3: Bağlantı URL'si
```
postgresql://yemek5_user:güvenli_şifre@sunucu_ip:5432/yemek5_db
```

## 3. Prisma Migration Çalıştırma

### Manuel Migration (Önerilen)
```bash
# Backend klasörüne git
cd backend

# Prisma client'ı oluştur
npx prisma generate

# Veritabanı şemasını oluştur
npx prisma db push

# Seed data ekle (opsiyonel)
npx prisma db seed
```

### Otomatik Migration (Render'da)
Backend servisinizde şu build komutunu kullanın:
```bash
npm install && npx prisma generate && npx prisma db push
```

## 4. Veritabanı Yedekleme ve Geri Yükleme

### Yedekleme
```bash
# Tüm veritabanını yedekle
pg_dump postgresql://user:password@host:port/database > backup.sql

# Sadece verileri yedekle
pg_dump --data-only postgresql://user:password@host:port/database > data_backup.sql
```

### Geri Yükleme
```bash
# Yedekten geri yükle
psql postgresql://user:password@host:port/database < backup.sql
```

## 5. Güvenlik Önerileri

1. **Güçlü Şifreler**: En az 12 karakter, büyük/küçük harf, sayı, özel karakter
2. **Firewall**: Sadece gerekli portları açın (5432)
3. **SSL Bağlantısı**: Production'da mutlaka SSL kullanın
4. **Düzenli Yedekleme**: Otomatik yedekleme sistemi kurun

## 6. Monitoring ve Logs

### Veritabanı Performansı
```sql
-- Aktif bağlantıları görüntüle
SELECT * FROM pg_stat_activity;

-- Tablo boyutlarını görüntüle
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';
```

## 7. Sorun Giderme

### Bağlantı Hatası
- Firewall ayarlarını kontrol edin
- Veritabanı servisinin çalıştığından emin olun
- Bağlantı URL'sini kontrol edin

### Yetki Hatası
- Kullanıcı yetkilerini kontrol edin
- Veritabanı sahipliğini kontrol edin

### Şema Hatası
- Prisma schema dosyasını kontrol edin
- Migration'ları sıfırlayıp yeniden çalıştırın

## 8. Maliyet Optimizasyonu

### Render PostgreSQL
- **Free Tier**: 90 gün ücretsiz
- **Paid**: $7/ay (1GB RAM, 1GB storage)

### Kendi Sunucu
- **VPS**: $5-20/ay
- **Dedicated**: $50+/ay

## 9. Production Checklist

- [ ] Güçlü şifreler kullanıldı
- [ ] SSL sertifikası kuruldu
- [ ] Firewall ayarlandı
- [ ] Yedekleme sistemi kuruldu
- [ ] Monitoring sistemi kuruldu
- [ ] Environment variables güvenli şekilde ayarlandı
- [ ] Log rotation ayarlandı
- [ ] Performance tuning yapıldı 