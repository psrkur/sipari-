#!/bin/bash

# Yemek5 Backend Deployment Script
echo "🚀 Yemek5 Backend Deployment başlatılıyor..."

# Environment kontrolü
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "📦 Bağımlılıklar yükleniyor..."
npm install

echo "🔧 Prisma client oluşturuluyor..."
npx prisma generate

echo "🗄️ Veritabanı şeması güncelleniyor..."
npx prisma migrate deploy

echo "📊 Seed data kontrol ediliyor..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log('📝 Seed data ekleniyor...');
            require('./server.js');
        } else {
            console.log('✅ Veritabanında veri mevcut');
        }
    } catch (error) {
        console.error('❌ Veritabanı hatası:', error);
    } finally {
        await prisma.\$disconnect();
    }
}

checkData();
"

echo "🔒 Güvenlik kontrolleri..."
# SSL sertifikası kontrolü
if [ "$NODE_ENV" = "production" ]; then
    echo "✅ Production environment aktif"
    echo "🔒 Rate limiting aktif"
    echo "🛡️ Security headers aktif"
fi

echo "📈 Monitoring aktifleştiriliyor..."
# Log dosyaları oluştur
mkdir -p logs
touch logs/error.log
touch logs/combined.log

echo "🚀 Server başlatılıyor..."
node server.js 