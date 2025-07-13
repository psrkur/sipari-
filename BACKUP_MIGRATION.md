# 🚀 Projeyi Kendi Sunucuna Taşıma Rehberi

## 📋 Gereksinimler

### Sunucu Gereksinimleri:
- **Node.js 18+** 
- **PostgreSQL** veya **MySQL**
- **Git**
- **PM2** (process manager için)
- **Nginx** (reverse proxy için)

### Minimum Sistem Gereksinimleri:
- **RAM**: 2GB minimum, 4GB önerilen
- **CPU**: 2 core minimum
- **Disk**: 20GB minimum
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

---

## 🔄 Adım 1: Render'dan Veritabanı Yedekleme

### 1.1 Render PostgreSQL'e Bağlanma
```bash
# Render PostgreSQL connection string'ini alın
# Render Dashboard > Backend Service > Environment > DATABASE_URL
```

### 1.2 Veritabanı Dump Alma
```bash
# PostgreSQL dump alma
pg_dump "postgresql://username:password@host:port/database" > backup.sql

# Örnek:
pg_dump "postgresql://yemek5_user:password123@dpg-abc123-a.oregon-postgres.render.com/yemek5_db" > yemek5_backup.sql
```

### 1.3 Veri Kontrolü
```bash
# Dump dosyasını kontrol edin
head -20 yemek5_backup.sql
tail -20 yemek5_backup.sql
```

---

## 🖥️ Adım 2: Kendi Sunucunuzu Hazırlama

### 2.1 Sunucu Güncelleme
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2.2 Node.js Kurulumu
```bash
# Node.js 18+ kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Versiyon kontrolü
node --version
npm --version
```

### 2.3 PostgreSQL Kurulumu
```bash
# PostgreSQL kurulumu
sudo apt install postgresql postgresql-contrib -y

# PostgreSQL servisini başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL durumunu kontrol et
sudo systemctl status postgresql
```

### 2.4 Git Kurulumu
```bash
sudo apt install git -y
```

---

## 🗄️ Adım 3: Veritabanı Kurulumu

### 3.1 PostgreSQL Kullanıcı Oluşturma
```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Veritabanı ve kullanıcı oluştur
CREATE DATABASE yemek5_db;
CREATE USER yemek5_user WITH PASSWORD 'güvenli_şifre_123';
GRANT ALL PRIVILEGES ON DATABASE yemek5_db TO yemek5_user;
\q
```

### 3.2 Veritabanı Restore
```bash
# Backup dosyasını restore et
psql -U yemek5_user -d yemek5_db -h localhost < yemek5_backup.sql

# Veya
sudo -u postgres psql yemek5_db < yemek5_backup.sql
```

### 3.3 Veritabanı Bağlantı Testi
```bash
# Bağlantıyı test et
psql -U yemek5_user -d yemek5_db -h localhost
# Şifre girmeniz istenecek

# Tabloları kontrol et
\dt
SELECT COUNT(*) FROM "User";
\q
```

---

## 📁 Adım 4: Proje Dosyalarını Taşıma

### 4.1 Projeyi Clone Etme
```bash
# Sunucuda proje dizini oluştur
mkdir /var/www/yemek5
cd /var/www/yemek5

# GitHub'dan projeyi clone et
git clone https://github.com/psrkur/sipari-.git .

# Backend dizinine git
cd backend
```

### 4.2 Environment Variables Ayarlama
```bash
# .env dosyası oluştur
nano .env
```

```env
# .env dosyası içeriği
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://yemek5_user:güvenli_şifre_123@localhost:5432/yemek5_db"
JWT_SECRET="çok_güvenli_jwt_secret_key_değiştirin"
FRONTEND_URL="https://your-domain.com"
```

### 4.3 Bağımlılıkları Kurma
```bash
# Backend bağımlılıkları
npm install

# Prisma client oluştur
npx prisma generate
```

---

## 🔧 Adım 5: Uygulama Kurulumu

### 5.1 PM2 Kurulumu
```bash
# PM2 kurulumu
npm install -g pm2

# PM2 startup script oluştur
pm2 startup
```

### 5.2 Uygulamayı Başlatma
```bash
# Backend'i PM2 ile başlat
cd /var/www/yemek5/backend
pm2 start server.js --name "yemek5-backend"

# PM2 durumunu kontrol et
pm2 status
pm2 logs yemek5-backend
```

### 5.3 Frontend Kurulumu (Opsiyonel)
```bash
# Frontend dizinine git
cd /var/www/yemek5/frontend

# Bağımlılıkları kur
npm install

# Build al
npm run build

# Frontend'i PM2 ile başlat
pm2 start npm --name "yemek5-frontend" -- start
```

---

## 🌐 Adım 6: Nginx Kurulumu ve Konfigürasyonu

### 6.1 Nginx Kurulumu
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.2 Nginx Konfigürasyonu
```bash
# Nginx config dosyası oluştur
sudo nano /etc/nginx/sites-available/yemek5
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (opsiyonel)
    location / {
        root /var/www/yemek5/frontend/.next;
        try_files $uri $uri/ /_next/static/$uri;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /var/www/yemek5/backend/uploads;
    }
}
```

### 6.3 Nginx'i Etkinleştirme
```bash
# Site'ı etkinleştir
sudo ln -s /etc/nginx/sites-available/yemek5 /etc/nginx/sites-enabled/

# Nginx syntax kontrolü
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl reload nginx
```

---

## 🔒 Adım 7: SSL Sertifikası (Opsiyonel)

### 7.1 Certbot Kurulumu
```bash
# Certbot kurulumu
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikası al
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 📊 Adım 8: Monitoring ve Logging

### 8.1 PM2 Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logları görüntüle
pm2 logs yemek5-backend --lines 100
```

### 8.2 Sistem Monitoring
```bash
# Disk kullanımı
df -h

# RAM kullanımı
free -h

# CPU kullanımı
htop
```

---

## 🔄 Adım 9: Otomatik Backup

### 9.1 Backup Script Oluşturma
```bash
# Backup script oluştur
nano /var/www/yemek5/backup.sh
```

```bash
#!/bin/bash
# Backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/yemek5"
DB_NAME="yemek5_db"
DB_USER="yemek5_user"

# Backup dizini oluştur
mkdir -p $BACKUP_DIR

# Veritabanı backup
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Dosya backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/yemek5

# Eski backup'ları temizle (30 günden eski)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 9.2 Cron Job Ekleme
```bash
# Cron job ekle
crontab -e

# Günlük backup (her gece 2'de)
0 2 * * * /var/www/yemek5/backup.sh
```

---

## ✅ Adım 10: Test ve Doğrulama

### 10.1 API Testleri
```bash
# API endpoint'lerini test et
curl http://localhost:3001/
curl http://localhost:3001/api/branches
```

### 10.2 Veritabanı Testleri
```bash
# Veritabanı bağlantısını test et
psql -U yemek5_user -d yemek5_db -c "SELECT COUNT(*) FROM \"User\";"
```

### 10.3 Uygulama Testleri
```bash
# PM2 durumunu kontrol et
pm2 status

# Logları kontrol et
pm2 logs yemek5-backend --lines 50
```

---

## 🚨 Güvenlik Önlemleri

### Firewall Ayarları
```bash
# UFW firewall kurulumu
sudo apt install ufw -y

# SSH, HTTP, HTTPS portlarını aç
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Firewall'u etkinleştir
sudo ufw enable
```

### Güvenlik Güncellemeleri
```bash
# Otomatik güvenlik güncellemeleri
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📞 Sorun Giderme

### Yaygın Sorunlar:

1. **Port 3001 kullanımda**: `sudo netstat -tlnp | grep 3001`
2. **PostgreSQL bağlantı hatası**: `sudo systemctl status postgresql`
3. **Nginx hatası**: `sudo nginx -t`
4. **PM2 hatası**: `pm2 logs yemek5-backend`

### Log Dosyaları:
- **Nginx**: `/var/log/nginx/error.log`
- **PM2**: `pm2 logs yemek5-backend`
- **PostgreSQL**: `/var/log/postgresql/postgresql-*.log`

---

## 🎯 Sonuç

Bu rehberi takip ederek projenizi kendi sunucunuza başarıyla taşıyabilirsiniz. Tüm verileriniz güvenli bir şekilde korunacak ve sistem production'da çalışmaya hazır olacak.

### Önemli Notlar:
- ✅ Veritabanı backup'ını mutlaka alın
- ✅ Güvenli şifreler kullanın
- ✅ SSL sertifikası alın
- ✅ Düzenli backup yapın
- ✅ Monitoring kurun

Başarılar! 🚀 