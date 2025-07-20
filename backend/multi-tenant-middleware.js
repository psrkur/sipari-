const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Firma bazlı veri filtreleme middleware'i
const companyFilter = async (req, res, next) => {
  try {
    // Kullanıcının firma ID'sini al
    const userCompanyId = req.user?.companyId;
    
    if (!userCompanyId) {
      return res.status(403).json({ error: 'Firma bilgisi bulunamadı' });
    }

    // Request'e firma ID'sini ekle
    req.companyId = userCompanyId;
    
    // Firma aktif mi kontrol et
    const company = await prisma.company.findUnique({
      where: { id: userCompanyId },
      select: { isActive: true }
    });

    if (!company || !company.isActive) {
      return res.status(403).json({ error: 'Firma aktif değil' });
    }

    next();
  } catch (error) {
    console.error('Firma filtreleme hatası:', error);
    res.status(500).json({ error: 'Firma doğrulama hatası' });
  }
};

// Süper admin kontrolü (tüm firmalara erişim)
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Süper admin yetkisi gerekli' });
  }
  next();
};

// Firma admin kontrolü
const companyAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'COMPANY_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Firma admin yetkisi gerekli' });
  }
  next();
};

// Şube müdürü kontrolü
const branchManagerOnly = (req, res, next) => {
  if (!['BRANCH_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Şube müdürü yetkisi gerekli' });
  }
  next();
};

// Firma bazlı veri getirme yardımcı fonksiyonları
const getCompanyData = {
  // Firma bazlı kullanıcılar
  users: async (companyId) => {
    return await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isApproved: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  },

  // Firma bazlı şubeler
  branches: async (companyId) => {
    return await prisma.branch.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        _count: {
          select: {
            users: true,
            products: true,
            orders: true
          }
        }
      }
    });
  },

  // Firma bazlı kategoriler
  categories: async (companyId) => {
    return await prisma.category.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
  },

  // Firma bazlı ürünler
  products: async (companyId, branchId = null) => {
    const where = { companyId };
    if (branchId) {
      where.branchId = parseInt(branchId);
    }

    return await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  },

  // Firma bazlı siparişler
  orders: async (companyId, branchId = null) => {
    const where = { companyId };
    if (branchId) {
      where.branchId = parseInt(branchId);
    }

    return await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Firma bazlı müşteriler
  customers: async (companyId) => {
    return await prisma.customer.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        _count: {
          select: {
            orders: true
          }
        }
      }
    });
  }
};

module.exports = {
  companyFilter,
  superAdminOnly,
  companyAdminOnly,
  branchManagerOnly,
  getCompanyData
}; 