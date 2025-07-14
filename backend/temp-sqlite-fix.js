#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Temporary SQLite Fix for Development');
console.log('=======================================\n');

// Create a temporary SQLite schema file
const sqliteSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  phone     String?
  address   String?
  role      String   @default("CUSTOMER")
  branchId  Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
  branch    Branch?  @relation(fields: [branchId], references: [id])
  addresses UserAddress[]

  @@map("users")
}

model UserAddress {
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String
  address   String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])

  @@map("user_addresses")
}

model Branch {
  id        Int       @id @default(autoincrement())
  name      String
  address   String
  phone     String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  orders    Order[]
  products  Product[]
  users     User[]

  @@map("branches")
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  products    Product[]

  @@map("categories")
}

model Product {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  price       Float
  categoryId  Int
  image       String?
  isActive    Boolean   @default(true)
  branchId    Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  orderItems  OrderItem[]
  branch      Branch    @relation(fields: [branchId], references: [id])
  category    Category  @relation(fields: [categoryId], references: [id])

  @@map("products")
}

model Order {
  id          Int         @id @default(autoincrement())
  orderNumber String      @unique
  userId      Int
  branchId    Int
  customerId  Int?
  status      String      @default("PENDING")
  totalAmount Float
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  user        User        @relation(fields: [userId], references: [id])
  branch      Branch      @relation(fields: [branchId], references: [id])
  customer    Customer?   @relation(fields: [customerId], references: [id])
  orderItems  OrderItem[]

  @@map("orders")
}

model Customer {
  id        Int      @id @default(autoincrement())
  name      String
  phone     String   @unique
  email     String?
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]

  @@map("customers")
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Float
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}`;

// Backup current schema
const currentSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const backupPath = path.join(__dirname, 'prisma', 'schema.prisma.backup');

if (fs.existsSync(currentSchemaPath)) {
  fs.copyFileSync(currentSchemaPath, backupPath);
  console.log('✅ Current schema backed up to schema.prisma.backup');
}

// Write SQLite schema
fs.writeFileSync(currentSchemaPath, sqliteSchema);
console.log('✅ SQLite schema written');

// --- YENİ: uploads klasöründeki resimleri veritabanına aktar ---
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function migrateImagesToDb() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads klasörü yok.');
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  let updated = 0;
  for (const file of files) {
    const imagePath = `/uploads/${file}`;
    const fullPath = path.join(uploadsDir, file);
    const product = await prisma.product.findFirst({ where: { image: imagePath } });
    if (product && fs.existsSync(fullPath)) {
      const imageData = fs.readFileSync(fullPath);
      await prisma.product.update({
        where: { id: product.id },
        data: { imageData }
      });
      updated++;
      console.log(`Aktarıldı: ${product.name} (${imagePath})`);
    }
  }
  console.log(`Toplam ${updated} ürün resmi veritabanına aktarıldı.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  migrateImagesToDb();
}

console.log('\n📋 NEXT STEPS:');
console.log('==============');
console.log('1. Run: npx prisma generate');
console.log('2. Run: npx prisma db push');
console.log('3. Run: npm run dev');
console.log('4. Test profile updates locally');
console.log('5. Fix production database (see fix-production-db.js)');
console.log('6. Restore PostgreSQL schema when production is fixed\n');

console.log('🔄 TO RESTORE POSTGRESQL SCHEMA LATER:');
console.log('   - Copy schema.prisma.backup to schema.prisma');
console.log('   - Run: npx prisma generate');
console.log('   - Run: npx prisma db push\n');

console.log('✅ This will fix local development while you fix production!'); 