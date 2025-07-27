# 🖼️ Image Storage Fix Guide

## Problem
Render'ın ephemeral storage özelliği nedeniyle production'da resim dosyaları kaybolmuş. Hata mesajları:
```
Resim dosyası bulunamadı: /opt/render/project/src/backend/uploads/1753560250468-355372446-__izar_beypazar___lomonlu__soda.png
```

## Solutions

### Solution 1: Base64 Image Storage (Recommended)

Bu çözüm resimleri veritabanında base64 formatında saklar.

#### Step 1: Run the setup script
```bash
cd backend
npm run setup-images
```

Bu script:
- Yerel resimleri base64'e çevirir
- Veritabanındaki ürün resim yollarını günceller
- Production'da resim sorunlarını çözer

#### Step 2: Deploy to production
```bash
git add .
git commit -m "Fix image storage with base64"
git push
```

### Solution 2: Cloudinary Integration

Eğer base64 çözümü istemiyorsanız, Cloudinary kullanabilirsiniz.

#### Step 1: Cloudinary setup
1. [Cloudinary](https://cloudinary.com) hesabı oluşturun
2. Environment variables ekleyin:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

#### Step 2: Run the fix script
```bash
cd backend
npm run fix-images
```

### Solution 3: Image Mapping

Bu çözüm resimleri bir mapping dosyasında saklar.

#### Step 1: Create image mapping
```bash
cd backend
node setup-image-storage.js mapping
```

Bu komut `image-mapping.json` dosyası oluşturur.

#### Step 2: Update server to use mapping
Server.js'de image serving kısmını güncelleyin.

## Quick Fix Commands

### 1. Base64 Conversion (En hızlı çözüm)
```bash
cd backend
npm run setup-images
```

### 2. Check current images
```bash
cd backend
npm run sync-images
```

### 3. Deploy to production
```bash
git add .
git commit -m "Fix missing images"
git push
```

## Verification

### 1. Check production logs
Render dashboard'da logları kontrol edin.

### 2. Test image endpoints
```bash
curl https://yemek5-backend.onrender.com/uploads/products/1753560250468-355372446-__izar_beypazar___lomonlu__soda.png
```

### 3. Check database
Veritabanında ürün resim yollarının güncellendiğini kontrol edin.

## Prevention

### 1. Use Cloud Storage
- Cloudinary
- AWS S3
- Google Cloud Storage

### 2. Base64 Storage
- Küçük resimler için uygun
- Veritabanı boyutunu artırır

### 3. CDN Integration
- Resimleri CDN'de saklayın
- Daha hızlı yükleme

## Troubleshooting

### Problem: Script çalışmıyor
```bash
# Dependencies yükle
npm install

# Script'i tekrar çalıştır
npm run setup-images
```

### Problem: Database connection error
```bash
# Environment variables kontrol et
echo $DATABASE_URL

# Manual connection test
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log('Connected')).catch(console.error)"
```

### Problem: Images still missing
```bash
# Production'da script çalıştır
cd backend
node setup-image-storage.js
```

## Files Created

1. `backend/setup-image-storage.js` - Ana çözüm scripti
2. `backend/fix-image-storage.js` - Cloudinary çözümü
3. `backend/deploy-images.js` - Deployment scripti
4. `backend/upload-images-to-production.js` - Upload scripti

## Next Steps

1. **Immediate**: `npm run setup-images` çalıştırın
2. **Deploy**: Production'a push edin
3. **Verify**: Resimlerin çalıştığını kontrol edin
4. **Optimize**: Cloud storage'a geçiş yapın

## Support

Eğer sorun devam ederse:
1. Production loglarını kontrol edin
2. Database connection'ı test edin
3. Environment variables'ları kontrol edin
4. Script'leri tekrar çalıştırın 