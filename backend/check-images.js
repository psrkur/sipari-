const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function checkImages() {
  try {
    console.log('🔍 Image paths kontrol ediliyor...\n');
    
    // Local files
    const localUploadsDir = path.join(__dirname, 'uploads', 'products');
    const files = fs.readdirSync(localUploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`📁 Local files: ${imageFiles.length}`);
    console.log('First 5 local files:');
    imageFiles.slice(0, 5).forEach(f => console.log('  -', f));

    // Database products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`\n📊 Database products: ${products.length}`);
    console.log('First 5 database images:');
    products.slice(0, 5).forEach(p => {
      const imageName = p.image ? path.basename(p.image) : 'NO_IMAGE';
      console.log(`  - ${p.name} -> ${imageName}`);
    });

    // Check matches
    console.log('\n🔍 Matching analysis:');
    let matches = 0;
    let noMatches = 0;

    for (const product of products) {
      if (!product.image) {
        console.log(`  ❌ ${product.name}: NO_IMAGE`);
        noMatches++;
        continue;
      }

      const imageName = path.basename(product.image);
      const hasFile = imageFiles.includes(imageName);
      
      if (hasFile) {
        console.log(`  ✅ ${product.name} -> ${imageName}`);
        matches++;
      } else {
        console.log(`  ❌ ${product.name} -> ${imageName} (FILE_NOT_FOUND)`);
        noMatches++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Matches: ${matches}`);
    console.log(`  ❌ No matches: ${noMatches}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImages(); 