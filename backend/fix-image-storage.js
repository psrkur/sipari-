#!/usr/bin/env node

/**
 * 🖼️ Image Storage Fix Script
 * 
 * Bu script Render'ın ephemeral storage sorununu çözmek için:
 * 1. Cloudinary'ye resimleri yükler
 * 2. Veritabanındaki resim yollarını günceller
 * 3. Production'da resim sorunlarını çözer
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

console.log('🖼️  Image Storage Fix Script Başlatılıyor...\n');

// Cloudinary konfigürasyonu
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});

// Veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

// Local uploads directory
const localUploadsDir = path.join(__dirname, 'uploads', 'products');

async function uploadToCloudinary(imagePath, filename) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(imagePath, {
      folder: 'yemek5/products',
      public_id: path.parse(filename).name,
      overwrite: true,
      resource_type: 'image'
    }, (error, result) => {
      if (error) {
        console.error(`❌ Cloudinary upload hatası (${filename}):`, error.message);
        reject(error);
      } else {
        console.log(`✅ Cloudinary'ye yüklendi: ${filename} -> ${result.secure_url}`);
        resolve(result.secure_url);
      }
    });
  });
}

async function updateProductImage(productId, imageUrl) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { image: imageUrl }
    });
    console.log(`✅ Ürün güncellendi: ID ${productId} -> ${imageUrl}`);
  } catch (error) {
    console.error(`❌ Veritabanı güncelleme hatası (ID ${productId}):`, error.message);
    throw error;
  }
}

async function fixImageStorage() {
  try {
    console.log('🔄 Image storage düzeltiliyor...\n');
    
    // Local uploads klasörünü kontrol et
    if (!fs.existsSync(localUploadsDir)) {
      console.error('❌ Local uploads klasörü bulunamadı:', localUploadsDir);
      return;
    }

    console.log('✅ Local uploads klasörü mevcut:', localUploadsDir);

    // Tüm resim dosyalarını listele
    const files = fs.readdirSync(localUploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`📊 ${imageFiles.length} resim dosyası bulundu\n`);

    // Veritabanından tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün veritabanında bulundu\n`);

    let uploadedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Her resim dosyası için
    for (const filename of imageFiles) {
      const imagePath = path.join(localUploadsDir, filename);
      
      try {
        // Cloudinary'ye yükle
        const cloudinaryUrl = await uploadToCloudinary(imagePath, filename);
        uploadedCount++;

        // Bu resmi kullanan ürünleri bul ve güncelle
        const matchingProducts = products.filter(product => {
          if (!product.image) return false;
          const productImageName = path.basename(product.image);
          return productImageName === filename;
        });

        for (const product of matchingProducts) {
          try {
            await updateProductImage(product.id, cloudinaryUrl);
            updatedCount++;
          } catch (error) {
            console.error(`❌ Ürün güncelleme hatası (${product.name}):`, error.message);
            errorCount++;
          }
        }

      } catch (error) {
        console.error(`❌ Hata (${filename}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 IMAGE STORAGE FIX TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ Cloudinary'ye yüklenen: ${uploadedCount}`);
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('='.repeat(50));

    if (uploadedCount > 0) {
      console.log('\n💡 Sonraki adımlar:');
      console.log('1. Cloudinary environment variables\'ları production\'a ekleyin');
      console.log('2. Production sunucusunu yeniden başlatın');
      console.log('3. Resimlerin doğru yüklendiğini kontrol edin');
    }

  } catch (error) {
    console.error('❌ Fix hatası:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştır
if (require.main === module) {
  fixImageStorage();
}

module.exports = { fixImageStorage }; 