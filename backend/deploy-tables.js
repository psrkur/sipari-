const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function deployTables() {
  try {
    console.log('🚀 Starting database deployment...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Create tables
    await createTables();
    
    // Create super admin user - sadece yoksa
    await createSuperAdmin();
    
    // Seed data ekle - sadece veritabanı boşsa
    await seedInitialData();
    
    console.log('🎉 Deployment completed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createTables() {
  console.log('📋 Creating database tables...');

  // Create branches table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      phone VARCHAR(255) NOT NULL,
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create categories table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create customers table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255),
      address TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create users table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(255),
      address TEXT,
      role VARCHAR(255) DEFAULT 'CUSTOMER',
      "branchId" INTEGER,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("branchId") REFERENCES branches(id)
    );
  `;

  // Create products table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      "categoryId" INTEGER NOT NULL,
      image VARCHAR(255),
      "isActive" BOOLEAN DEFAULT true,
      "branchId" INTEGER NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES categories(id),
      FOREIGN KEY ("branchId") REFERENCES branches(id)
    );
  `;

  // Create orders table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      "orderNumber" VARCHAR(255) UNIQUE NOT NULL,
      "userId" INTEGER NOT NULL,
      "branchId" INTEGER NOT NULL,
      "customerId" INTEGER,
      status VARCHAR(255) DEFAULT 'PENDING',
      "totalAmount" DECIMAL(10,2) NOT NULL,
      notes TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id),
      FOREIGN KEY ("branchId") REFERENCES branches(id),
      FOREIGN KEY ("customerId") REFERENCES customers(id)
    );
  `;

  // Create order_items table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      "orderId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY ("orderId") REFERENCES orders(id),
      FOREIGN KEY ("productId") REFERENCES products(id)
    );
  `;

  // Create indexes
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users("branchId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products("categoryId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_products_branch_id ON products("branchId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders("userId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders("branchId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items("orderId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items("productId");`;

  console.log('✅ All tables and indexes created');
}

async function createSuperAdmin() {
  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Super admin already exists');
      return;
    }

    // Create default branch if it doesn't exist
    let branch = await prisma.branch.findFirst();
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: 'Ana Şube',
          address: 'Merkez Mahallesi, Ana Cadde No:1',
          phone: '+90 555 123 4567',
          isActive: true
        }
      });
      console.log('✅ Default branch created');
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@yemek5.com',
        password: hashedPassword,
        name: 'Super Admin',
        phone: '+90 555 123 4567',
        role: 'SUPER_ADMIN',
        branchId: branch.id
      }
    });

    console.log('✅ Super admin created');
    console.log('📧 Email: admin@yemek5.com');
    console.log('🔑 Password: admin123');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  }
}

async function seedInitialData() {
  try {
    // Veritabanında veri var mı kontrol et
    const existingBranches = await prisma.branch.count();
    const existingCategories = await prisma.category.count();
    const existingProducts = await prisma.product.count();
    
    if (existingBranches > 0 || existingCategories > 0 || existingProducts > 0) {
      console.log('✅ Veritabanında zaten veri var, seed data atlanıyor');
      return;
    }
    
    console.log('📦 Veritabanı boş, seed data oluşturuluyor...');
    
    // Create default categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Pizza',
          description: 'Çeşitli pizza türleri',
          isActive: true
        }
      }),
      prisma.category.create({
        data: {
          name: 'Burger',
          description: 'Lezzetli burgerler',
          isActive: true
        }
      }),
      prisma.category.create({
        data: {
          name: 'İçecek',
          description: 'Soğuk ve sıcak içecekler',
          isActive: true
        }
      })
    ]);

    // Get default branch
    const branch = await prisma.branch.findFirst();
    if (!branch) {
      console.log('❌ No branch found for seeding products');
      return;
    }

    // Create sample products
    await Promise.all([
      prisma.product.create({
        data: {
          name: 'Margherita Pizza',
          description: 'Domates sosu, mozzarella peyniri, fesleğen',
          price: 45.00,
          categoryId: categories[0].id,
          branchId: branch.id,
          isActive: true
        }
      }),
      prisma.product.create({
        data: {
          name: 'Klasik Burger',
          description: 'Dana eti, marul, domates, soğan',
          price: 35.00,
          categoryId: categories[1].id,
          branchId: branch.id,
          isActive: true
        }
      }),
      prisma.product.create({
        data: {
          name: 'Kola',
          description: '330ml Coca Cola',
          price: 8.00,
          categoryId: categories[2].id,
          branchId: branch.id,
          isActive: true
        }
      })
    ]);

    console.log('✅ Initial data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

deployTables(); 