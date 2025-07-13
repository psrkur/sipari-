# Shell ile Veritabanı Kurulum Rehberi

## 1. PostgreSQL Kurulumu (Ubuntu/Debian)

### Adım 1: Sistem Güncellemesi
```bash
sudo apt update
sudo apt upgrade -y
```

### Adım 2: PostgreSQL Kurulumu
```bash
# PostgreSQL kurulumu
sudo apt install postgresql postgresql-contrib -y

# Servisi başlat ve otomatik başlatmayı etkinleştir
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Durumu kontrol et
sudo systemctl status postgresql
```

### Adım 3: PostgreSQL Güvenlik Ayarları
```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Güçlü şifre oluştur
ALTER USER postgres PASSWORD 'GüvenliŞifre123!';

# Veritabanı oluştur
CREATE DATABASE yemek5_db;

# Kullanıcı oluştur
CREATE USER yemek5_user WITH PASSWORD 'GüvenliKullanıcıŞifre123!';

# Yetkileri ver
GRANT ALL PRIVILEGES ON DATABASE yemek5_db TO yemek5_user;
GRANT ALL ON SCHEMA public TO yemek5_user;

# Çıkış
\q
```

## 2. PostgreSQL Kurulumu (CentOS/RHEL)

### Adım 1: Sistem Hazırlığı
```bash
# EPEL repository ekle
sudo yum install epel-release -y

# PostgreSQL repository ekle
sudo yum install https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm -y
```

### Adım 2: PostgreSQL Kurulumu
```bash
# PostgreSQL 15 kurulumu
sudo yum install postgresql15 postgresql15-server postgresql15-contrib -y

# Veritabanını başlat
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Servisi başlat
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Durumu kontrol et
sudo systemctl status postgresql-15
```

### Adım 3: Güvenlik Ayarları
```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Güçlü şifre oluştur
ALTER USER postgres PASSWORD 'GüvenliŞifre123!';

# Veritabanı oluştur
CREATE DATABASE yemek5_db;

# Kullanıcı oluştur
CREATE USER yemek5_user WITH PASSWORD 'GüvenliKullanıcıŞifre123!';

# Yetkileri ver
GRANT ALL PRIVILEGES ON DATABASE yemek5_db TO yemek5_user;
GRANT ALL ON SCHEMA public TO yemek5_user;

# Çıkış
\q
```

## 3. PostgreSQL Konfigürasyonu

### Adım 1: pg_hba.conf Düzenleme
```bash
# Dosyayı düzenle
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Şu satırları ekle/düzenle:
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
host    all             all             0.0.0.0/0               md5

# Dosyayı kaydet ve çık (Ctrl+X, Y, Enter)
```

### Adım 2: postgresql.conf Düzenleme
```bash
# Dosyayı düzenle
sudo nano /etc/postgresql/15/main/postgresql.conf

# Şu ayarları ekle/düzenle:
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 128MB
effective_cache_size = 512MB

# Dosyayı kaydet ve çık
```

### Adım 3: Servisi Yeniden Başlat
```bash
sudo systemctl restart postgresql
```

## 4. Firewall Ayarları

### Ubuntu/Debian (UFW)
```bash
# UFW'yi etkinleştir
sudo ufw enable

# PostgreSQL portunu aç
sudo ufw allow 5432/tcp

# SSH portunu aç (sunucu erişimi için)
sudo ufw allow 22/tcp

# Durumu kontrol et
sudo ufw status
```

### CentOS/RHEL (Firewalld)
```bash
# Firewalld'yi etkinleştir
sudo systemctl start firewalld
sudo systemctl enable firewalld

# PostgreSQL portunu aç
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# Durumu kontrol et
sudo firewall-cmd --list-ports
```

## 5. Veritabanı Bağlantı Testi

### Adım 1: Yerel Bağlantı Testi
```bash
# PostgreSQL'e bağlan
psql -h localhost -U yemek5_user -d yemek5_db

# Test sorgusu
SELECT version();
SELECT current_database();
SELECT current_user;

# Çıkış
\q
```

### Adım 2: Uzak Bağlantı Testi
```bash
# Başka bir makineden test et
psql -h SUNUCU_IP -U yemek5_user -d yemek5_db
```

## 6. Prisma ile Veritabanı Şeması Oluşturma

### Adım 1: Backend Klasörüne Git
```bash
cd backend
```

### Adım 2: Environment Variables Ayarla
```bash
# .env dosyası oluştur
cat > .env << EOF
DATABASE_URL="postgresql://yemek5_user:GüvenliKullanıcıŞifre123!@localhost:5432/yemek5_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
EOF
```

### Adım 3: Prisma Kurulumu
```bash
# Prisma CLI kurulumu
npm install -g prisma

# Prisma client oluştur
npx prisma generate

# Veritabanı şemasını oluştur
npx prisma db push

# Seed data ekle (opsiyonel)
npx prisma db seed
```

## 7. Veritabanı Yönetimi Komutları

### Veritabanı Durumu Kontrolü
```bash
# Aktif bağlantıları görüntüle
psql -U yemek5_user -d yemek5_db -c "SELECT * FROM pg_stat_activity;"

# Tablo boyutlarını görüntüle
psql -U yemek5_user -d yemek5_db -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';"
```

### Yedekleme ve Geri Yükleme
```bash
# Tam yedekleme
pg_dump -U yemek5_user -h localhost yemek5_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Sadece veri yedekleme
pg_dump --data-only -U yemek5_user -h localhost yemek5_db > data_backup_$(date +%Y%m%d_%H%M%S).sql

# Yedekten geri yükleme
psql -U yemek5_user -h localhost yemek5_db < backup_20241201_143000.sql
```

### Performans Optimizasyonu
```bash
# PostgreSQL'e bağlan
psql -U yemek5_user -d yemek5_db

# Slow query'leri bul
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# Index kullanımını kontrol et
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 8. Monitoring ve Logs

### Log Dosyalarını İzleme
```bash
# PostgreSQL loglarını izle
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Sistem loglarını izle
sudo journalctl -u postgresql -f
```

### Performans Monitoring
```bash
# Aktif bağlantı sayısı
psql -U yemek5_user -d yemek5_db -c "SELECT count(*) FROM pg_stat_activity;"

# Veritabanı boyutu
psql -U yemek5_user -d yemek5_db -c "SELECT pg_size_pretty(pg_database_size('yemek5_db'));"

# Cache hit ratio
psql -U yemek5_user -d yemek5_db -c "
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::float as ratio
FROM pg_statio_user_tables;"
```

## 9. Güvenlik Kontrolleri

### Güvenlik Taraması
```bash
# Açık portları kontrol et
sudo netstat -tlnp | grep 5432

# PostgreSQL süreçlerini kontrol et
ps aux | grep postgres

# Güvenlik duvarı durumu
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-all  # CentOS
```

### SSL Sertifikası Kurulumu (Opsiyonel)
```bash
# SSL sertifikası oluştur
sudo mkdir -p /etc/ssl/certs/postgresql
cd /etc/ssl/certs/postgresql

# Self-signed sertifika oluştur
sudo openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key -subj "/CN=localhost"

# Dosya izinlerini ayarla
sudo chmod 600 server.key
sudo chmod 644 server.crt
sudo chown postgres:postgres server.key server.crt
```

## 10. Otomatik Yedekleme Scripti

### Yedekleme Scripti Oluşturma
```bash
# Backup script oluştur
cat > /home/backup_script.sh << 'EOF'
#!/bin/bash

# Değişkenler
DB_NAME="yemek5_db"
DB_USER="yemek5_user"
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup dizini oluştur
mkdir -p $BACKUP_DIR

# Yedekleme
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 7 günden eski yedekleri sil
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
EOF

# Script'i çalıştırılabilir yap
chmod +x /home/backup_script.sh

# Cron job ekle (günde 2 kez yedekleme)
echo "0 2,14 * * * /home/backup_script.sh" | crontab -
```

## 11. Sorun Giderme

### Bağlantı Sorunları
```bash
# PostgreSQL servis durumu
sudo systemctl status postgresql

# Port dinleme durumu
sudo netstat -tlnp | grep 5432

# Log dosyalarını kontrol et
sudo tail -n 50 /var/log/postgresql/postgresql-15-main.log
```

### Performans Sorunları
```bash
# Aktif bağlantıları kontrol et
psql -U yemek5_user -d yemek5_db -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Lock'ları kontrol et
psql -U yemek5_user -d yemek5_db -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Slow query'leri bul
psql -U yemek5_user -d yemek5_db -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;"
```

## 12. Production Checklist

- [ ] PostgreSQL kurulumu tamamlandı
- [ ] Güvenlik ayarları yapıldı
- [ ] Firewall kuralları eklendi
- [ ] SSL sertifikası kuruldu (opsiyonel)
- [ ] Yedekleme sistemi kuruldu
- [ ] Monitoring sistemi kuruldu
- [ ] Performance tuning yapıldı
- [ ] Log rotation ayarlandı
- [ ] Güvenlik taraması yapıldı
- [ ] Test bağlantıları başarılı 