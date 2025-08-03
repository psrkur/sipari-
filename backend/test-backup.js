const backupSystem = require('./backup-system');
const logger = require('./utils/logger');

async function testBackupSystem() {
  console.log('🧪 Yedekleme sistemi test ediliyor...');
  
  try {
    // 1. Yedekleme durumunu kontrol et
    console.log('\n📊 Yedekleme Durumu:');
    const status = backupSystem.getBackupStatus();
    console.log(status);
    
    // 2. Manuel yedekleme test et
    console.log('\n🔄 Manuel yedekleme test ediliyor...');
    const backupFile = await backupSystem.triggerManualBackup();
    console.log('✅ Manuel yedekleme tamamlandı:', backupFile);
    
    // 3. Yedek listesini kontrol et
    console.log('\n📋 Yedek Listesi:');
    const backups = backupSystem.getBackupList();
    console.log('Toplam yedek sayısı:', backups.length);
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename} (${backup.size}) - ${backup.created}`);
    });
    
    // 4. İstatistikleri kontrol et
    console.log('\n📈 Yedekleme İstatistikleri:');
    const stats = backupSystem.getBackupStatus();
    console.log('Toplam yedek:', stats.totalBackups);
    console.log('Başarı oranı:', stats.successRate + '%');
    console.log('Son yedekleme:', stats.lastBackup);
    console.log('Veritabanı türü:', stats.databaseType);
    
    console.log('\n✅ Tüm testler başarıyla tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
}

// Test'i çalıştır
if (require.main === module) {
  testBackupSystem();
}

module.exports = { testBackupSystem }; 