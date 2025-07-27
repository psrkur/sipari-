#!/usr/bin/env node

/**
 * 🖼️ Real Images Sync Script
 * 
 * uploads/products klasöründeki gerçek resimleri veritabanına senkronize eder
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🖼️ Real Images Sync Script Başlatılıyor...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function syncRealImages() {
  try {
    console.log('🔄 Gerçek resimler senkronize ediliyor...\n');
    
    // uploads/products klasöründeki resimleri al
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    const imageFiles = fs.readdirSync(uploadsDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    });
    
    console.log(`📁 ${imageFiles.length} resim dosyası bulundu\n`);
    
    // Tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });
    
    console.log(`📊 ${products.length} ürün bulundu\n`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        // Ürün adına göre resim dosyası bul
        const productName = product.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c');
        
        // Resim dosyası ara
        let matchedFile = null;
        for (const file of imageFiles) {
          const fileName = file.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
          
          if (fileName.includes(productName) || productName.includes(fileName.replace(/\.(png|jpg|jpeg|gif|webp)$/, ''))) {
            matchedFile = file;
            break;
          }
        }
        
        if (matchedFile) {
          // Resim dosyasını base64'e çevir
          const imagePath = path.join(uploadsDir, matchedFile);
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = `data:image/${path.extname(matchedFile).substring(1)};base64,${imageBuffer.toString('base64')}`;
          
          // Veritabanını güncelle
          await prisma.product.update({
            where: { id: product.id },
            data: { image: base64Image }
          });
          
          console.log(`✅ ${product.name} -> ${matchedFile} eklendi`);
          updatedCount++;
        } else {
          console.log(`⚠️  ${product.name} -> Eşleşen resim bulunamadı`);
        }
      } catch (error) {
        console.log(`❌ ${product.name} -> Hata: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n==================================================');
    console.log('📈 REAL IMAGES SYNC TAMAMLANDI');
    console.log('==================================================');
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📊 Toplam ürün: ${products.length}`);
    console.log('==================================================\n');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncRealImages(); 