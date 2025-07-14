#!/bin/bash

echo "🔧 Migration başlatılıyor..."

# Prisma client'ı generate et
npx prisma generate

# Migration'ı uygula
npx prisma migrate deploy

echo "✅ Migration tamamlandı"

# Sunucuyu başlat
node server.js 