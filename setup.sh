#!/bin/bash

echo "🍔 FastFood Hızlı Satış Uygulaması Kurulumu"
echo "=============================================="

# Ana bağımlılıkları yükle
echo "📦 Ana bağımlılıklar yükleniyor..."
npm install

# Backend kurulumu
echo "🔧 Backend kurulumu..."
cd backend
npm install

# .env dosyası oluştur
if [ ! -f .env ]; then
    echo "📝 .env dosyası oluşturuluyor..."
    cp env.example .env
fi

# Veritabanını oluştur
echo "🗄️ Veritabanı oluşturuluyor..."
npx prisma migrate dev --name init

# Frontend kurulumu
echo "🎨 Frontend kurulumu..."
cd ../frontend
npm install

# Ana dizine dön
cd ..

echo "✅ Kurulum tamamlandı!"
echo ""
echo "🚀 Uygulamayı başlatmak için:"
echo "   npm run dev"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo ""
echo "👤 Admin girişi:"
echo "   Email: admin@fastfood.com"
echo "   Şifre: admin123" 