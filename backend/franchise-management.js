// Franchise Yönetim Sistemi
const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
    }
  }
});

class FranchiseManagement {
  constructor() {
    this.logger = logger;
  }

  // Franchise oluşturma
  async createFranchise(franchiseData) {
    try {
      console.log('Franchise oluşturma başladı:', franchiseData);
      
      const franchise = await prisma.franchise.create({
        data: {
          name: franchiseData.name,
          code: franchiseData.code,
          ownerName: franchiseData.ownerName,
          ownerEmail: franchiseData.ownerEmail,
          ownerPhone: franchiseData.ownerPhone,
          address: franchiseData.address,
          city: franchiseData.city,
          agreementDate: new Date(franchiseData.agreementDate),
          monthlyRoyalty: franchiseData.monthlyRoyalty || 0
        }
      });

      this.logger.info(`Franchise created: ${franchise.code}`);
      return franchise;
    } catch (error) {
      console.error('Franchise creation error details:', error);
      this.logger.error('Franchise creation error:', error);
      throw error;
    }
  }

  // Franchise listesi
  async getAllFranchises() {
    try {
      console.log('Franchise listesi alınıyor...');
      
      // Önce tablo var mı kontrol edelim
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'franchises'
        );
      `;
      
      console.log('Franchises tablosu mevcut mu:', tableExists);
      
      if (!tableExists[0].exists) {
        throw new Error('Franchises tablosu bulunamadı');
      }
      
      // Sütunları kontrol edelim
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'franchises'
      `;
      
      console.log('Franchises tablosu sütunları:', columns);
      
      const franchises = await prisma.franchise.findMany({
        include: {
          branch: true,
          supportTickets: {
            where: { status: 'open' },
            orderBy: { createdAt: 'desc' }
          },
          performanceReports: {
            orderBy: { reportDate: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('Franchise listesi başarıyla alındı:', franchises.length, 'franchise');
      return franchises;
    } catch (error) {
      console.error('Franchise list error details:', error);
      this.logger.error('Franchise list error:', error);
      throw error;
    }
  }

  // Franchise detayı
  async getFranchiseById(id) {
    try {
      const franchise = await prisma.franchise.findUnique({
        where: { id: parseInt(id) },
        include: {
          branch: true,
          supportTickets: {
            orderBy: { createdAt: 'desc' }
          },
          performanceReports: {
            orderBy: { reportDate: 'desc' }
          }
        }
      });

      return franchise;
    } catch (error) {
      this.logger.error('Franchise detail error:', error);
      throw error;
    }
  }

  // Franchise güncelleme
  async updateFranchise(id, updateData) {
    try {
      const franchise = await prisma.franchise.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      this.logger.info(`Franchise updated: ${franchise.code}`);
      return franchise;
    } catch (error) {
      this.logger.error('Franchise update error:', error);
      throw error;
    }
  }

  // Franchise performans raporu
  async createPerformanceReport(franchiseId, reportData) {
    try {
      const report = await prisma.franchisePerformanceReport.create({
        data: {
          franchiseId: parseInt(franchiseId),
          reportDate: new Date(reportData.reportDate),
          monthlyRevenue: reportData.monthlyRevenue,
          orderCount: reportData.orderCount,
          customerCount: reportData.customerCount,
          averageOrderValue: reportData.averageOrderValue,
          customerSatisfaction: reportData.customerSatisfaction,
          complianceScore: reportData.complianceScore,
          notes: reportData.notes
        }
      });

      this.logger.info(`Performance report created for franchise: ${franchiseId}`);
      return report;
    } catch (error) {
      this.logger.error('Performance report creation error:', error);
      throw error;
    }
  }

  // Destek talebi oluşturma
  async createSupportTicket(franchiseId, ticketData) {
    try {
      const ticket = await prisma.franchiseSupportTicket.create({
        data: {
          franchiseId: parseInt(franchiseId),
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority || 'medium'
        }
      });

      this.logger.info(`Support ticket created: ${ticket.id}`);
      return ticket;
    } catch (error) {
      this.logger.error('Support ticket creation error:', error);
      throw error;
    }
  }

  // Destek talebi güncelleme
  async updateSupportTicket(ticketId, updateData) {
    try {
      const ticket = await prisma.franchiseSupportTicket.update({
        where: { id: parseInt(ticketId) },
        data: updateData
      });

      this.logger.info(`Support ticket updated: ${ticket.id}`);
      return ticket;
    } catch (error) {
      this.logger.error('Support ticket update error:', error);
      throw error;
    }
  }

  // Franchise istatistikleri
  async getFranchiseStats() {
    try {
      const stats = await prisma.franchise.aggregate({
        _count: {
          id: true
        },
        _avg: {
          performanceScore: true,
          monthlyRoyalty: true
        }
      });

      const activeFranchises = await prisma.franchise.count({
        where: { status: 'active' }
      });

      const openTickets = await prisma.franchiseSupportTicket.count({
        where: { status: 'open' }
      });

      return {
        totalFranchises: stats._count.id,
        activeFranchises,
        averagePerformanceScore: stats._avg.performanceScore,
        averageMonthlyRoyalty: stats._avg.monthlyRoyalty,
        openSupportTickets: openTickets
      };
    } catch (error) {
      this.logger.error('Franchise stats error:', error);
      throw error;
    }
  }

  // Franchise'a şube atama
  async assignBranchToFranchise(franchiseId, branchId) {
    try {
      const franchise = await prisma.franchise.update({
        where: { id: parseInt(franchiseId) },
        data: { branchId: parseInt(branchId) },
        include: { branch: true }
      });

      this.logger.info(`Branch ${branchId} assigned to franchise ${franchiseId}`);
      return franchise;
    } catch (error) {
      this.logger.error('Branch assignment error:', error);
      throw error;
    }
  }

  // Franchise performans analizi
  async analyzeFranchisePerformance(franchiseId) {
    try {
      const franchise = await prisma.franchise.findUnique({
        where: { id: parseInt(franchiseId) },
        include: {
          performanceReports: {
            orderBy: { reportDate: 'desc' },
            take: 6 // Son 6 ay
          },
          branch: {
            include: {
              orders: {
                where: {
                  createdAt: {
                    gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                  }
                }
              }
            }
          }
        }
      });

      if (!franchise) {
        throw new Error('Franchise not found');
      }

      const monthlyOrders = franchise.branch?.orders?.length || 0;
      const averageRevenue = franchise.performanceReports.length > 0 
        ? franchise.performanceReports[0].monthlyRevenue 
        : 0;

      return {
        franchiseId,
        name: franchise.name,
        code: franchise.code,
        status: franchise.status,
        monthlyOrders,
        averageRevenue,
        performanceScore: franchise.performanceScore,
        recentReports: franchise.performanceReports
      };
    } catch (error) {
      this.logger.error('Franchise performance analysis error:', error);
      throw error;
    }
  }
}

module.exports = new FranchiseManagement(); 