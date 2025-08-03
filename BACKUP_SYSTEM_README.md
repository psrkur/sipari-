# 💾 Veritabanı Yedekleme Sistemi

Bu sistem, PostgreSQL ve SQLite veritabanları için otomatik yedekleme işlemlerini yönetir.

## 🚀 Özellikler

### ✅ Otomatik Yedekleme
- **Günlük Yedekleme**: Her gün saat 02:00
- **Haftalık Yedekleme**: Her Pazar saat 03:00
- **Akıllı Temizlik**: Eski yedekleri otomatik silme

### 📊 Yedekleme Yönetimi
- Manuel yedekleme tetikleme
- Yedek dosyalarını indirme
- Yedek dosyalarını silme
- Yedekleme istatistikleri

### 🔧 Desteklenen Veritabanları
- **PostgreSQL**: Tam yedekleme ve geri yükleme
- **SQLite**: Dosya kopyalama yöntemi

## 📁 Dosya Yapısı

```
backend/
├── backup-system.js      # Ana yedekleme sistemi
├── backup-api.js         # API endpoint'leri
├── backups/              # Yedek dosyaları dizini
│   ├── postgresql-backup-*.sql
│   ├── sqlite-backup-*.db
│   └── backup-stats.json
└── test-backup.js        # Test scripti
```

## 🛠️ Kurulum

### 1. Gerekli Paketler
```bash
# PostgreSQL için pg_dump (sistemde kurulu olmalı)
# Windows: https://www.postgresql.org/download/windows/
# Linux: sudo apt-get install postgresql-client
# macOS: brew install postgresql
```

### 2. Ortam Değişkenleri
```env
DATABASE_URL=postgresql://user:password@host:port/database
# veya
DATABASE_URL=file:./dev.db
```

## 📖 Kullanım

### Manuel Yedekleme
```bash
# Backend dizininde
npm run backup
# veya
node backup-system.js
```

### Test Etme
```bash
npm run test-backup
# veya
node test-backup.js
```

### API Endpoint'leri

#### Yedekleme Durumu
```http
GET /api/backup/status
```

#### Manuel Yedekleme
```http
POST /api/backup/trigger
```

#### Yedek Listesi
```http
GET /api/backup/list
```

#### Yedek İndirme
```http
GET /api/backup/download/{filename}
```

#### Yedek Silme
```http
DELETE /api/backup/delete/{filename}
```

#### Yedekleme İstatistikleri
```http
GET /api/backup/stats
```

#### Yedekleme Ayarları
```http
GET /api/backup/settings
```

## 🎯 Frontend Kullanımı

### Admin Panelinde Erişim
1. Admin paneline giriş yapın
2. Sol sidebar'da "💾 Yedekleme" linkine tıklayın
3. Yedekleme yönetim sayfası açılacak

### Özellikler
- **Durum Kartları**: Veritabanı türü, toplam yedek, başarı oranı, son yedekleme
- **İstatistikler**: Toplam boyut, ortalama boyut, başarı oranı
- **Yedek Listesi**: Tüm yedek dosyalarını görüntüleme
- **İşlemler**: İndirme, silme, manuel yedekleme

## ⚙️ Yapılandırma

### Yedekleme Zamanlaması
```javascript
// backup-system.js içinde
scheduleBackups() {
  // Günlük: Her gün saat 02:00
  // Haftalık: Her Pazar saat 03:00
}
```

### Yedek Saklama Süreleri
```javascript
const maxAge = {
  daily: 7 * 24 * 60 * 60 * 1000,    // 7 gün
  weekly: 30 * 24 * 60 * 60 * 1000,  // 30 gün
  monthly: 90 * 24 * 60 * 60 * 1000  // 90 gün
};
```

## 🔒 Güvenlik

### Dosya İzinleri
```bash
# Yedekleme dizini için güvenli izinler
chmod 750 backend/backups
chown www-data:www-data backend/backups
```

### Şifreleme (Opsiyonel)
```javascript
// Yedek dosyalarını şifrelemek için
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.BACKUP_SECRET, 'salt', 32);
```

## 📊 Monitoring

### Log Takibi
```bash
# Yedekleme loglarını takip et
tail -f logs/backup.log
```

### Disk Kullanımı
```bash
# Yedekleme dizini boyutunu kontrol et
du -sh backend/backups/
```

## 🚨 Sorun Giderme

### PostgreSQL Yedekleme Hatası
```bash
# pg_dump kurulu mu kontrol et
which pg_dump

# Bağlantıyı test et
psql -h host -U user -d database -c "SELECT 1;"
```

### SQLite Yedekleme Hatası
```bash
# Dosya izinlerini kontrol et
ls -la backend/dev.db

# Dosya var mı kontrol et
file backend/dev.db
```

### Disk Alanı
```bash
# Disk alanını kontrol et
df -h

# Büyük dosyaları bul
find backend/backups -type f -size +100M
```

## 📈 Performans Optimizasyonu

### Sıkıştırma
```javascript
// Yedek dosyalarını sıkıştır
const zlib = require('zlib');
const gzip = zlib.createGzip();
```

### Paralel Yedekleme
```javascript
// Birden fazla veritabanını paralel yedekle
const promises = databases.map(db => backupDatabase(db));
await Promise.all(promises);
```

## 🔄 Geri Yükleme

### PostgreSQL Geri Yükleme
```bash
# Yedek dosyasından geri yükle
psql -h host -U user -d database < backup-file.sql
```

### SQLite Geri Yükleme
```bash
# Yedek dosyasını kopyala
cp backup-file.db dev.db
```

## 📝 Notlar

- Yedekleme işlemi sunucu performansını etkileyebilir
- Büyük veritabanları için yedekleme süresi uzun olabilir
- Yedek dosyaları güvenli bir yerde saklanmalı
- Düzenli olarak yedek dosyalarının bütünlüğü kontrol edilmeli

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

**💡 İpucu**: Yedekleme sistemini production'a almadan önce test ortamında deneyin! 