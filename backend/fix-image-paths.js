const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30"
    }
  }
});

async function fixImagePaths() {
  try {
    console.log('🔄 Ürün resim yolları düzeltiliyor...\n');
    
    // uploads/products klasöründeki resimleri al
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      console.error('❌ Uploads klasörü bulunamadı:', uploadsDir);
      return;
    }

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
          // Yeni resim yolu oluştur
          const newImagePath = `/uploads/products/${matchedFile}`;
          
          // Veritabanını güncelle
          await prisma.product.update({
            where: { id: product.id },
            data: { image: newImagePath }
          });
          
          console.log(`✅ ${product.name} -> ${matchedFile} (${newImagePath})`);
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
    console.log('📈 IMAGE PATH FIX TAMAMLANDI');
    console.log('==================================================');
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📊 Toplam ürün: ${products.length}`);
    console.log('==================================================\n');
    
    console.log('💡 Sonraki adımlar:');
    console.log('1. Frontend\'de resimlerin doğru yüklendiğini kontrol edin');
    console.log('2. Yeni resim yükleme sistemini test edin');
    console.log('3. Gerekirse manuel resim eşleştirmesi yapın');

  } catch (error) {
    console.error('❌ Fix hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
fixImagePaths(); 