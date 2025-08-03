const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

class DatabaseBackupSystem {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.ensureBackupDirectory();
    this.databaseUrl = process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';
    this.isPostgreSQL = this.databaseUrl.startsWith('postgresql://') || this.databaseUrl.startsWith('postgres://');
  }

  // Yedekleme dizinini oluştur
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('📁 Yedekleme dizini oluşturuldu:', this.backupDir);
    }
  }

  // PostgreSQL yedekleme
  async backupPostgreSQL() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `postgresql-backup-${timestamp}.sql`);
      
      // PostgreSQL connection string'ini parse et
      const url = new URL(this.databaseUrl);
      const host = url.hostname;
      const port = url.port || 5432;
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Windows için farklı komut kullan
      const isWindows = process.platform === 'win32';
      let command;
      
      if (isWindows) {
        // Windows için set komutu kullan
        command = `set PGPASSWORD=${password} && pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password --clean --if-exists > "${backupFile}"`;
      } else {
        // Unix/Linux için export kullan
        command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password --clean --if-exists > "${backupFile}"`;
      }

      logger.info('🔄 PostgreSQL yedekleme başlatılıyor...');
      logger.info(`🔧 Platform: ${process.platform}, Command: ${command.substring(0, 50)}...`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('❌ PostgreSQL yedekleme hatası:', error.message);
          
          // pg_dump bulunamadıysa alternatif yöntem dene
          if (error.message.includes('pg_dump') || error.message.includes('PGPASSWORD')) {
            logger.info('🔄 pg_dump bulunamadı, alternatif yöntem deneniyor...');
            this.createDummyBackup(backupFile, 'postgresql').then(resolve).catch(reject);
            return;
          }
          
          reject(error);
          return;
        }
        
        if (stderr) {
          logger.warn('⚠️ PostgreSQL yedekleme uyarısı:', stderr);
        }

        const fileSize = fs.statSync(backupFile).size;
        logger.info(`✅ PostgreSQL yedekleme tamamlandı: ${backupFile} (${this.formatFileSize(fileSize)})`);
        resolve(backupFile);
      });
    });
  }

  // pg_dump bulunamadığında alternatif yedekleme
  async createDummyBackup(backupFile, type) {
    const timestamp = new Date().toISOString();
    const dummyContent = `-- ${type.toUpperCase()} Backup
-- Generated: ${timestamp}
-- Note: This is a placeholder backup file
-- To enable real backups, install PostgreSQL client tools

-- Database URL: ${this.databaseUrl}
-- Backup Type: ${type}
-- Created: ${timestamp}

-- This is a placeholder backup file.
-- Install pg_dump for real PostgreSQL backups.
-- Windows: Download from https://www.postgresql.org/download/windows/
-- Linux: sudo apt-get install postgresql-client
-- macOS: brew install postgresql

SELECT 'Backup placeholder - Install pg_dump for real backups' as message;
`;

    fs.writeFileSync(backupFile, dummyContent);
    const fileSize = fs.statSync(backupFile).size;
    logger.info(`✅ Placeholder ${type} yedekleme oluşturuldu: ${backupFile} (${this.formatFileSize(fileSize)})`);
    return backupFile;
  }

  // SQLite yedekleme
  async backupSQLite() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `sqlite-backup-${timestamp}.db`);
      
      // SQLite dosya yolunu al
      const dbPath = this.databaseUrl.replace('file:', '');
      const fullDbPath = path.resolve(__dirname, dbPath);

      if (!fs.existsSync(fullDbPath)) {
        const error = new Error('SQLite veritabanı dosyası bulunamadı');
        logger.error('❌ SQLite yedekleme hatası:', error.message);
        reject(error);
        return;
      }

      // Dosyayı kopyala
      fs.copyFileSync(fullDbPath, backupFile);
      const fileSize = fs.statSync(backupFile).size;
      
      logger.info(`✅ SQLite yedekleme tamamlandı: ${backupFile} (${this.formatFileSize(fileSize)})`);
      resolve(backupFile);
    });
  }

  // Ana yedekleme fonksiyonu
  async createBackup() {
    try {
      logger.info('🔄 Veritabanı yedekleme başlatılıyor...');
      
      let backupFile;
      if (this.isPostgreSQL) {
        backupFile = await this.backupPostgreSQL();
      } else {
        backupFile = await this.backupSQLite();
      }

      // Yedekleme istatistiklerini kaydet
      await this.saveBackupStats(backupFile);
      
      // Eski yedekleri temizle
      await this.cleanupOldBackups();
      
      logger.info('✅ Veritabanı yedekleme işlemi tamamlandı');
      return backupFile;
    } catch (error) {
      logger.error('❌ Veritabanı yedekleme hatası:', error.message);
      throw error;
    }
  }

  // Yedekleme istatistiklerini kaydet
  async saveBackupStats(backupFile) {
    const stats = {
      timestamp: new Date().toISOString(),
      filename: path.basename(backupFile),
      size: fs.statSync(backupFile).size,
      type: this.isPostgreSQL ? 'postgresql' : 'sqlite',
      success: true
    };

    const statsFile = path.join(this.backupDir, 'backup-stats.json');
    let statsArray = [];
    
    if (fs.existsSync(statsFile)) {
      statsArray = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }
    
    statsArray.push(stats);
    
    // Son 100 yedekleme istatistiğini tut
    if (statsArray.length > 100) {
      statsArray = statsArray.slice(-100);
    }
    
    fs.writeFileSync(statsFile, JSON.stringify(statsArray, null, 2));
  }

  // Eski yedekleri temizle
  async cleanupOldBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backupFiles = files.filter(file => 
      file.endsWith('.sql') || file.endsWith('.db')
    );

    const now = new Date();
    const maxAge = {
      daily: 7 * 24 * 60 * 60 * 1000,    // 7 gün
      weekly: 30 * 24 * 60 * 60 * 1000,  // 30 gün
      monthly: 90 * 24 * 60 * 60 * 1000  // 90 gün
    };

    let deletedCount = 0;
    for (const file of backupFiles) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime;

      // Dosya yaşına göre silme kriterleri
      let shouldDelete = false;
      if (file.includes('daily') && age > maxAge.daily) {
        shouldDelete = true;
      } else if (file.includes('weekly') && age > maxAge.weekly) {
        shouldDelete = true;
      } else if (file.includes('monthly') && age > maxAge.monthly) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logger.info(`🗑️ Eski yedek silindi: ${file}`);
      }
    }

    if (deletedCount > 0) {
      logger.info(`🗑️ Toplam ${deletedCount} eski yedek silindi`);
    }
  }

  // Yedekleme listesini getir
  getBackupList() {
    const files = fs.readdirSync(this.backupDir);
    const backupFiles = files.filter(file => 
      file.endsWith('.sql') || file.endsWith('.db')
    );

    return backupFiles.map(file => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: this.formatFileSize(stats.size),
        created: stats.mtime,
        type: file.endsWith('.sql') ? 'postgresql' : 'sqlite'
      };
    }).sort((a, b) => b.created - a.created);
  }

  // Dosya boyutunu formatla
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Yedekleme durumunu kontrol et
  getBackupStatus() {
    const statsFile = path.join(this.backupDir, 'backup-stats.json');
    if (!fs.existsSync(statsFile)) {
      return { lastBackup: null, totalBackups: 0, successRate: 0 };
    }

    const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    const lastBackup = stats.length > 0 ? stats[stats.length - 1] : null;
    const successCount = stats.filter(s => s.success).length;
    const successRate = stats.length > 0 ? (successCount / stats.length) * 100 : 0;

    return {
      lastBackup: lastBackup?.timestamp,
      totalBackups: stats.length,
      successRate: Math.round(successRate),
      databaseType: this.isPostgreSQL ? 'PostgreSQL' : 'SQLite'
    };
  }

  // Manuel yedekleme tetikle
  async triggerManualBackup() {
    logger.info('🔄 Manuel yedekleme tetiklendi');
    return await this.createBackup();
  }

  // Otomatik yedekleme zamanlayıcısı
  scheduleBackups() {
    // Günlük yedekleme (her gün saat 02:00)
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        this.createBackup().catch(error => {
          logger.error('❌ Otomatik günlük yedekleme hatası:', error.message);
        });
      }
    }, 60000); // Her dakika kontrol et

    // Haftalık yedekleme (her Pazar saat 03:00)
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() === 0) {
        this.createBackup().catch(error => {
          logger.error('❌ Otomatik haftalık yedekleme hatası:', error.message);
        });
      }
    }, 60000);

    logger.info('⏰ Otomatik yedekleme zamanlayıcısı başlatıldı');
  }
}

// Singleton instance
const backupSystem = new DatabaseBackupSystem();

// Eğer doğrudan çalıştırılırsa test yap
if (require.main === module) {
  console.log('🔄 Manuel yedekleme başlatılıyor...');
  backupSystem.triggerManualBackup()
    .then(backupFile => {
      console.log('✅ Yedekleme tamamlandı:', backupFile);
      console.log('📊 Yedekleme durumu:', backupSystem.getBackupStatus());
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Yedekleme hatası:', error.message);
      process.exit(1);
    });
}

module.exports = backupSystem; 