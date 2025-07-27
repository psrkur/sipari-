#!/bin/bash

# 🚀 Yemek5 Deployment Script
# Bu script projeyi kendi sunucunuza deploy etmek için kullanılır

set -e  # Hata durumunda script'i durdur

echo "🚀 Yemek5 Deployment Script başlatılıyor..."

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonksiyonlar
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Sistem kontrolü
check_system() {
    log_info "Sistem gereksinimleri kontrol ediliyor..."
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        log_error "Node.js bulunamadı. Lütfen Node.js 18+ kurun."
        exit 1
    fi
    
    # NPM kontrolü
    if ! command -v npm &> /dev/null; then
        log_error "NPM bulunamadı. Lütfen NPM kurun."
        exit 1
    fi
    
    # Git kontrolü
    if ! command -v git &> /dev/null; then
        log_error "Git bulunamadı. Lütfen Git kurun."
        exit 1
    fi
    
    # PostgreSQL kontrolü
    if ! command -v psql &> /dev/null; then
        log_warn "PostgreSQL bulunamadı. Kurulum gerekli."
    fi
    
    log_info "Sistem gereksinimleri kontrol edildi."
}

# Proje dizini oluşturma
setup_project() {
    log_info "Proje dizini hazırlanıyor..."
    
    # Proje dizini oluştur
    sudo mkdir -p /var/www/yemek5
    sudo chown $USER:$USER /var/www/yemek5
    
    cd /var/www/yemek5
    
    # Git repo'dan projeyi çek
    if [ ! -d ".git" ]; then
        log_info "Git repository'den proje çekiliyor..."
        git clone https://github.com/psrkur/sipari-.git .
    else
        log_info "Proje güncelleniyor..."
        git pull origin main
    fi
    
    log_info "Proje dizini hazırlandı."
}

# Backend kurulumu
setup_backend() {
    log_info "Backend kurulumu başlatılıyor..."
    
    cd /var/www/yemek5/backend
    
    # Bağımlılıkları kur
    log_info "NPM bağımlılıkları kuruluyor..."
    npm install
    
    # Prisma client oluştur
    log_info "Prisma client oluşturuluyor..."
    npx prisma generate
    
    # .env dosyası kontrolü
    if [ ! -f ".env" ]; then
        log_warn ".env dosyası bulunamadı. Örnek dosya oluşturuluyor..."
        cat > .env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://yemek5_user:your_password@localhost:5432/yemek5_db"
JWT_SECRET="your_super_secret_jwt_key_change_this"
FRONTEND_URL="https://your-domain.com"
EOF
        log_warn "Lütfen .env dosyasını düzenleyin!"
    fi
    
    # Resim senkronizasyonu
    log_info "Canlı ortamdan resimler senkronize ediliyor..."
    if [ -f "discover-images.js" ]; then
        node discover-images.js
    elif [ -f "sync-images.js" ]; then
        node sync-images.js
    else
        log_warn "Resim senkronizasyon scripti bulunamadı, atlanıyor"
    fi
    
    log_info "Backend kurulumu tamamlandı."
}

# PM2 kurulumu ve başlatma
setup_pm2() {
    log_info "PM2 kurulumu ve yapılandırması..."
    
    # PM2 global kurulumu
    if ! command -v pm2 &> /dev/null; then
        log_info "PM2 kuruluyor..."
        npm install -g pm2
    fi
    
    # PM2 startup script
    pm2 startup
    
    # Backend'i PM2 ile başlat
    cd /var/www/yemek5/backend
    pm2 delete yemek5-backend 2>/dev/null || true
    pm2 start server.js --name "yemek5-backend"
    
    # PM2 save
    pm2 save
    
    log_info "PM2 kurulumu tamamlandı."
}

# Nginx kurulumu
setup_nginx() {
    log_info "Nginx kurulumu ve yapılandırması..."
    
    # Nginx kurulumu
    if ! command -v nginx &> /dev/null; then
        log_info "Nginx kuruluyor..."
        sudo apt update
        sudo apt install nginx -y
    fi
    
    # Nginx config oluştur
    sudo tee /etc/nginx/sites-available/yemek5 > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Uploads
    location /uploads {
        alias /var/www/yemek5/backend/uploads;
    }
    
    # Frontend (opsiyonel)
    location / {
        root /var/www/yemek5/frontend/.next;
        try_files \$uri \$uri/ /_next/static/\$uri;
    }
}
EOF
    
    # Site'ı etkinleştir
    sudo ln -sf /etc/nginx/sites-available/yemek5 /etc/nginx/sites-enabled/
    
    # Nginx syntax kontrolü
    sudo nginx -t
    
    # Nginx'i yeniden başlat
    sudo systemctl reload nginx
    
    log_info "Nginx kurulumu tamamlandı."
}

# Firewall ayarları
setup_firewall() {
    log_info "Firewall ayarları yapılıyor..."
    
    # UFW kurulumu
    if ! command -v ufw &> /dev/null; then
        sudo apt install ufw -y
    fi
    
    # Portları aç
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    
    # Firewall'u etkinleştir
    sudo ufw --force enable
    
    log_info "Firewall ayarları tamamlandı."
}

# Test fonksiyonu
test_deployment() {
    log_info "Deployment test ediliyor..."
    
    # PM2 durumu
    pm2 status
    
    # API testi
    if curl -s http://localhost:3001/ > /dev/null; then
        log_info "✅ Backend API çalışıyor"
    else
        log_error "❌ Backend API çalışmıyor"
    fi
    
    # Nginx testi
    if curl -s http://localhost/ > /dev/null; then
        log_info "✅ Nginx çalışıyor"
    else
        log_error "❌ Nginx çalışmıyor"
    fi
    
    log_info "Test tamamlandı."
}

# Ana fonksiyon
main() {
    log_info "Yemek5 Deployment Script başlatılıyor..."
    
    check_system
    setup_project
    setup_backend
    setup_pm2
    setup_nginx
    setup_firewall
    test_deployment
    
    log_info "🎉 Deployment tamamlandı!"
    log_info "📝 Yapılması gerekenler:"
    log_info "1. .env dosyasını düzenleyin"
    log_info "2. Veritabanını kurun ve backup'ı restore edin"
    log_info "3. Domain adresini Nginx config'de güncelleyin"
    log_info "4. SSL sertifikası alın (opsiyonel)"
    log_info "5. Frontend'i build edin (opsiyonel)"
}

# Script'i çalıştır
main "$@" 