// Franchise Yönetimi API Endpoint'leri
const express = require('express');
const router = express.Router();
const franchiseManagement = require('./franchise-management');
const { authenticateToken } = require('./middleware/auth');

// Franchise listesi (Sadece SUPER_ADMIN erişebilir)
router.get('/franchises', authenticateToken, async (req, res) => {
  try {
    // Sadece SUPER_ADMIN kontrolü
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const franchises = await franchiseManagement.getAllFranchises();
    
    res.json({
      success: true,
      franchises: franchises
    });
  } catch (error) {
    console.error('Franchise list error:', error);
    res.status(500).json({ error: 'Franchise listesi alınamadı' });
  }
});

// Franchise oluşturma (Sadece SUPER_ADMIN)
router.post('/franchises', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { name, code, ownerName, ownerEmail, ownerPhone, address, city, agreementDate, monthlyRoyalty } = req.body;

    if (!name || !code || !ownerName || !ownerEmail || !address || !city) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    const franchise = await franchiseManagement.createFranchise({
      name,
      code,
      ownerName,
      ownerEmail,
      ownerPhone,
      address,
      city,
      agreementDate,
      monthlyRoyalty
    });

    res.json({
      success: true,
      message: 'Franchise başarıyla oluşturuldu',
      franchise: franchise
    });
  } catch (error) {
    console.error('Franchise creation error:', error);
    res.status(500).json({ error: 'Franchise oluşturulamadı' });
  }
});

// Franchise detayı
router.get('/franchises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Franchise sahibi kendi franchise'ını görebilir
    // SUPER_ADMIN tüm franchise'ları görebilir
    const franchise = await franchiseManagement.getFranchiseById(id);
    
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise bulunamadı' });
    }

    // Eğer franchise sahibi ise sadece kendi franchise'ını görebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.email !== franchise.ownerEmail) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    res.json({
      success: true,
      franchise: franchise
    });
  } catch (error) {
    console.error('Franchise detail error:', error);
    res.status(500).json({ error: 'Franchise detayı alınamadı' });
  }
});

// Franchise güncelleme
router.put('/franchises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Sadece SUPER_ADMIN güncelleyebilir
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const franchise = await franchiseManagement.updateFranchise(id, updateData);

    res.json({
      success: true,
      message: 'Franchise başarıyla güncellendi',
      franchise: franchise
    });
  } catch (error) {
    console.error('Franchise update error:', error);
    res.status(500).json({ error: 'Franchise güncellenemedi' });
  }
});

// Franchise performans raporu oluşturma
router.post('/franchises/:id/performance-reports', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;

    // Franchise sahibi kendi raporunu oluşturabilir
    // SUPER_ADMIN tüm raporları oluşturabilir
    const franchise = await franchiseManagement.getFranchiseById(id);
    
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise bulunamadı' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && req.user.email !== franchise.ownerEmail) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const report = await franchiseManagement.createPerformanceReport(id, reportData);

    res.json({
      success: true,
      message: 'Performans raporu oluşturuldu',
      report: report
    });
  } catch (error) {
    console.error('Performance report creation error:', error);
    res.status(500).json({ error: 'Performans raporu oluşturulamadı' });
  }
});

// Destek talebi oluşturma
router.post('/franchises/:id/support-tickets', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ticketData = req.body;

    // Franchise sahibi destek talebi oluşturabilir
    const franchise = await franchiseManagement.getFranchiseById(id);
    
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise bulunamadı' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && req.user.email !== franchise.ownerEmail) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const ticket = await franchiseManagement.createSupportTicket(id, ticketData);

    res.json({
      success: true,
      message: 'Destek talebi oluşturuldu',
      ticket: ticket
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    res.status(500).json({ error: 'Destek talebi oluşturulamadı' });
  }
});

// Destek talebi güncelleme (Sadece SUPER_ADMIN)
router.put('/support-tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const updateData = req.body;

    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const ticket = await franchiseManagement.updateSupportTicket(ticketId, updateData);

    res.json({
      success: true,
      message: 'Destek talebi güncellendi',
      ticket: ticket
    });
  } catch (error) {
    console.error('Support ticket update error:', error);
    res.status(500).json({ error: 'Destek talebi güncellenemedi' });
  }
});

// Franchise istatistikleri (Sadece SUPER_ADMIN)
router.get('/franchises/stats/overview', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const stats = await franchiseManagement.getFranchiseStats();

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Franchise stats error:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// Franchise performans analizi
router.get('/franchises/:id/performance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const franchise = await franchiseManagement.getFranchiseById(id);
    
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise bulunamadı' });
    }

    // Franchise sahibi kendi performansını görebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.email !== franchise.ownerEmail) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const performance = await franchiseManagement.analyzeFranchisePerformance(id);

    res.json({
      success: true,
      performance: performance
    });
  } catch (error) {
    console.error('Franchise performance analysis error:', error);
    res.status(500).json({ error: 'Performans analizi yapılamadı' });
  }
});

// Franchise'a şube atama (Sadece SUPER_ADMIN)
router.post('/franchises/:id/assign-branch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId } = req.body;

    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    if (!branchId) {
      return res.status(400).json({ error: 'Şube ID gerekli' });
    }

    const franchise = await franchiseManagement.assignBranchToFranchise(id, branchId);

    res.json({
      success: true,
      message: 'Şube franchise\'a atandı',
      franchise: franchise
    });
  } catch (error) {
    console.error('Branch assignment error:', error);
    res.status(500).json({ error: 'Şube atanamadı' });
  }
});

// Franchise sahibi kendi franchise'ını görme
router.get('/my-franchise', authenticateToken, async (req, res) => {
  try {
    // Kullanıcının franchise'ını bul
    const franchises = await franchiseManagement.getAllFranchises();
    const userFranchise = franchises.find(f => f.ownerEmail === req.user.email);

    if (!userFranchise) {
      return res.status(404).json({ error: 'Franchise bulunamadı' });
    }

    res.json({
      success: true,
      franchise: userFranchise
    });
  } catch (error) {
    console.error('My franchise error:', error);
    res.status(500).json({ error: 'Franchise bilgisi alınamadı' });
  }
});

module.exports = router; 