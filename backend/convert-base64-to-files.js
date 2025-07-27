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

async function convertBase64ToFiles() {
  try {
    console.log('🔄 Base64 resimler dosya olarak kaydediliyor...\n');
    
    // uploads/products klasörünü kontrol et
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads klasörü oluşturuldu:', uploadsDir);
    }

    // Tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });
    
    console.log(`📊 ${products.length} ürün bulundu\n`);
    
    let convertedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        // Base64 resim kontrolü
        if (!product.image || !product.image.startsWith('data:image/')) {
          console.log(`⏭️  ${product.name} -> Base64 değil, atlanıyor`);
          continue;
        }
        
        // Base64'ten dosya adı oluştur
        const safeName = product.name
          .replace(/[ğ]/g, 'g')
          .replace(/[ü]/g, 'u')
          .replace(/[ş]/g, 's')
          .replace(/[ı]/g, 'i')
          .replace(/[ö]/g, 'o')
          .replace(/[ç]/g, 'c')
          .replace(/[Ğ]/g, 'G')
          .replace(/[Ü]/g, 'U')
          .replace(/[Ş]/g, 'S')
          .replace(/[İ]/g, 'I')
          .replace(/[Ö]/g, 'O')
          .replace(/[Ç]/g, 'C')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');
        
        // Content type'dan uzantı belirle
        const match = product.image.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          console.log(`❌ ${product.name} -> Geçersiz base64 format`);
          continue;
        }
        
        const contentType = match[1];
        const base64Data = match[2];
        
        let extension = '.png';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          extension = '.jpg';
        } else if (contentType.includes('gif')) {
          extension = '.gif';
        } else if (contentType.includes('webp')) {
          extension = '.webp';
        }
        
        const filename = `${safeName}${extension}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Dosya zaten varsa sayı ekle
        let finalFilename = filename;
        let counter = 1;
        while (fs.existsSync(path.join(uploadsDir, finalFilename))) {
          const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
          const ext = filename.substring(filename.lastIndexOf('.'));
          finalFilename = `${nameWithoutExt}_${counter}${ext}`;
          counter++;
        }
        
        const finalFilePath = path.join(uploadsDir, finalFilename);
        
        // Base64'ü dosya olarak kaydet
        const imageBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(finalFilePath, imageBuffer);
        
        // Veritabanını güncelle
        const newImagePath = `/uploads/products/${finalFilename}`;
        await prisma.product.update({
          where: { id: product.id },
          data: { image: newImagePath }
        });
        
        console.log(`✅ ${product.name} -> ${finalFilename} (${newImagePath})`);
        convertedCount++;
        
      } catch (error) {
        console.log(`❌ ${product.name} -> Hata: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n==================================================');
    console.log('📈 BASE64 TO FILE CONVERSION TAMAMLANDI');
    console.log('==================================================');
    console.log(`✅ Dönüştürülen: ${convertedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📊 Toplam: ${products.length}`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Conversion hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertBase64ToFiles(); 