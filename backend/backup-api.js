const express = require('express');
const router = express.Router();
const backupSystem = require('./backup-system');
const logger = require('./utils/logger');
const path = require('path');
const fs = require('fs');

// Yedekleme durumunu getir
router.get('/status', async (req, res) => {
  try {
    const status = backupSystem.getBackupStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Yedekleme durumu hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedekleme durumu alınamadı'
    });
  }
});

// Manuel yedekleme tetikle
router.post('/trigger', async (req, res) => {
  try {
    logger.info('🔄 Manuel yedekleme isteği alındı');
    
    const backupFile = await backupSystem.triggerManualBackup();
    
    res.json({
      success: true,
      message: 'Yedekleme başarıyla tamamlandı',
      data: {
        filename: path.basename(backupFile),
        size: backupSystem.formatFileSize(fs.statSync(backupFile).size),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Manuel yedekleme hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedekleme işlemi başarısız: ' + error.message
    });
  }
});

// Yedekleme listesini getir
router.get('/list', async (req, res) => {
  try {
    const backups = backupSystem.getBackupList();
    
    res.json({
      success: true,
      data: {
        backups,
        total: backups.length,
        totalSize: backups.reduce((sum, backup) => {
          const sizeInBytes = parseInt(backup.size.split(' ')[0]) * 1024;
          return sum + sizeInBytes;
        }, 0)
      }
    });
  } catch (error) {
    logger.error('Yedekleme listesi hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedekleme listesi alınamadı'
    });
  }
});

// Belirli bir yedeği indir
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(backupSystem.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Yedek dosyası bulunamadı'
      });
    }
    
    res.download(backupPath, filename, (error) => {
      if (error) {
        logger.error('Yedek indirme hatası:', error.message);
        res.status(500).json({
          success: false,
          error: 'Yedek indirilemedi'
        });
      }
    });
  } catch (error) {
    logger.error('Yedek indirme hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedek indirilemedi'
    });
  }
});

// Belirli bir yedeği sil
router.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(backupSystem.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Yedek dosyası bulunamadı'
      });
    }
    
    fs.unlinkSync(backupPath);
    logger.info(`🗑️ Yedek silindi: ${filename}`);
    
    res.json({
      success: true,
      message: 'Yedek başarıyla silindi'
    });
  } catch (error) {
    logger.error('Yedek silme hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedek silinemedi'
    });
  }
});

// Yedekleme ayarlarını getir
router.get('/settings', async (req, res) => {
  try {
    const settings = {
      databaseType: backupSystem.isPostgreSQL ? 'PostgreSQL' : 'SQLite',
      backupDirectory: backupSystem.backupDir,
      autoBackup: {
        daily: 'Her gün saat 02:00',
        weekly: 'Her Pazar saat 03:00'
      },
      retention: {
        daily: '7 gün',
        weekly: '30 gün',
        monthly: '90 gün'
      }
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Yedekleme ayarları hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedekleme ayarları alınamadı'
    });
  }
});

// Yedekleme istatistiklerini getir
router.get('/stats', async (req, res) => {
  try {
    const status = backupSystem.getBackupStatus();
    const backups = backupSystem.getBackupList();
    
    const stats = {
      totalBackups: status.totalBackups,
      successRate: status.successRate,
      lastBackup: status.lastBackup,
      totalSize: backups.reduce((sum, backup) => {
        const sizeInBytes = parseInt(backup.size.split(' ')[0]) * 1024;
        return sum + sizeInBytes;
      }, 0),
      averageSize: backups.length > 0 ? 
        backups.reduce((sum, backup) => {
          const sizeInBytes = parseInt(backup.size.split(' ')[0]) * 1024;
          return sum + sizeInBytes;
        }, 0) / backups.length : 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Yedekleme istatistikleri hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Yedekleme istatistikleri alınamadı'
    });
  }
});

module.exports = router; 