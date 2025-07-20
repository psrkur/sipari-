const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Firma oluşturma
async function createCompany(req, res) {
  try {
    const { name, domain, logo, address, phone, email } = req.body;

    // Domain benzersizlik kontrolü
    const existingCompany = await prisma.company.findUnique({
      where: { domain }
    });

    if (existingCompany) {
      return res.status(400).json({ error: 'Bu domain zaten kullanılıyor' });
    }

    // Firma oluştur
    const company = await prisma.company.create({
      data: {
        name,
        domain,
        logo,
        address,
        phone,
        email,
        isActive: true
      }
    });

    // Firma için süper admin oluştur
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: `admin@${domain}.com`,
        password: hashedPassword,
        name: `${name} Süper Admin`,
        role: 'COMPANY_ADMIN',
        companyId: company.id,
        isActive: true,
        isApproved: true
      }
    });

    // Firma için varsayılan şube oluştur
    const defaultBranch = await prisma.branch.create({
      data: {
        name: 'Merkez Şube',
        address: address || 'Adres belirtilmemiş',
        phone: phone || 'Telefon belirtilmemiş',
        companyId: company.id,
        isActive: true
      }
    });

    // Firma için varsayılan kategoriler oluştur
    const defaultCategories = [
      { name: 'Pizzalar', description: 'Taze pizzalar' },
      { name: 'İçecekler', description: 'Soğuk ve sıcak içecekler' },
      { name: 'Tatlılar', description: 'Lezzetli tatlılar' }
    ];

    for (const category of defaultCategories) {
      await prisma.category.create({
        data: {
          ...category,
          companyId: company.id,
          isActive: true
        }
      });
    }

    res.status(201).json({
      message: 'Firma başarıyla oluşturuldu',
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain
      },
      admin: {
        email: superAdmin.email,
        password: 'admin123'
      },
      branch: {
        id: defaultBranch.id,
        name: defaultBranch.name
      }
    });

  } catch (error) {
    console.error('Firma oluşturma hatası:', error);
    res.status(500).json({ error: 'Firma oluşturulurken hata oluştu' });
  }
}

// Firma listesi
async function getCompanies(req, res) {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        logo: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            branches: true,
            products: true,
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(companies);
  } catch (error) {
    console.error('Firma listesi hatası:', error);
    res.status(500).json({ error: 'Firma listesi alınırken hata oluştu' });
  }
}

// Firma detayı
async function getCompany(req, res) {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            isApproved: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            isActive: true
          }
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true
          }
        },
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Firma bulunamadı' });
    }

    res.json(company);
  } catch (error) {
    console.error('Firma detayı hatası:', error);
    res.status(500).json({ error: 'Firma detayı alınırken hata oluştu' });
  }
}

// Firma güncelleme
async function updateCompany(req, res) {
  try {
    const { id } = req.params;
    const { name, logo, address, phone, email, isActive } = req.body;

    const company = await prisma.company.update({
      where: { id: parseInt(id) },
      data: {
        name,
        logo,
        address,
        phone,
        email,
        isActive
      }
    });

    res.json({ message: 'Firma başarıyla güncellendi', company });
  } catch (error) {
    console.error('Firma güncelleme hatası:', error);
    res.status(500).json({ error: 'Firma güncellenirken hata oluştu' });
  }
}

// Firma silme
async function deleteCompany(req, res) {
  try {
    const { id } = req.params;

    // Firma ve tüm ilişkili verileri sil
    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: {
          order: {
            companyId: parseInt(id)
          }
        }
      }),
      prisma.order.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.product.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.category.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.table.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.userAddress.deleteMany({
        where: {
          user: {
            companyId: parseInt(id)
          }
        }
      }),
      prisma.user.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.customer.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.branch.deleteMany({
        where: { companyId: parseInt(id) }
      }),
      prisma.company.delete({
        where: { id: parseInt(id) }
      })
    ]);

    res.json({ message: 'Firma ve tüm verileri başarıyla silindi' });
  } catch (error) {
    console.error('Firma silme hatası:', error);
    res.status(500).json({ error: 'Firma silinirken hata oluştu' });
  }
}

// Firma istatistikleri
async function getCompanyStats(req, res) {
  try {
    const { id } = req.params;

    const stats = await prisma.company.findUnique({
      where: { id: parseInt(id) },
      select: {
        _count: {
          select: {
            users: true,
            branches: true,
            products: true,
            orders: true,
            customers: true
          }
        },
        orders: {
          select: {
            totalAmount: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({ error: 'Firma bulunamadı' });
    }

    // Toplam satış tutarı
    const totalSales = stats.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Bu ay satış tutarı
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthSales = stats.orders
      .filter(order => new Date(order.createdAt) >= thisMonth)
      .reduce((sum, order) => sum + order.totalAmount, 0);

    // Sipariş durumu dağılımı
    const orderStatusCounts = stats.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalUsers: stats._count.users,
      totalBranches: stats._count.branches,
      totalProducts: stats._count.products,
      totalOrders: stats._count.orders,
      totalCustomers: stats._count.customers,
      totalSales,
      thisMonthSales,
      orderStatusCounts
    });

  } catch (error) {
    console.error('Firma istatistikleri hatası:', error);
    res.status(500).json({ error: 'Firma istatistikleri alınırken hata oluştu' });
  }
}

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
}; 