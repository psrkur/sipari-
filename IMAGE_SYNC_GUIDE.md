# 🖼️ Resim Senkronizasyon Kılavuzu

Bu kılavuz, canlı ortamda yüklenen resimlerin yerel dosya sisteminize senkronize edilmesi için oluşturulmuştur.

## 📋 Sorun

Canlı ortamda yüklenen resimler, manuel deploy yapıldığında siliniyor. Bu durum, canlıdaki verilerin yerel dosya sisteminize aktarılmamasından kaynaklanıyor.

## ✅ Çözümler

### 1. Otomatik Resim Keşfi (Önerilen)

```bash
cd backend
npm run discover-images
```

Bu script:
- Canlı ortamdan bilinen resimleri kontrol eder
- Eksik resimleri otomatik indirir
- Yerel dosya analizi yapar
- Detaylı rapor sunar

### 2. Basit Resim İndirme

```bash
cd backend
npm run download-images
```

Bu script sadece bilinen resimleri indirir.

### 3. Manuel Senkronizasyon

```bash
cd backend
npm run sync-images
```

Bu script veritabanı bağlantısı gerektirir.

## 🔧 Yeni Resim Ekleme

### Adım 1: Canlı Ortama Resim Yükleyin
- Admin panelinden yeni ürün ekleyin
- Resim yükleyin

### Adım 2: Resim Yolunu Bulun
- Canlı ortamda resmin URL'ini kontrol edin
- Örnek: `https://yemek5-backend.onrender.com/uploads/products/yeni_urun.png`

### Adım 3: Scripti Güncelleyin
`backend/discover-images.js` dosyasındaki `knownImages` dizisine ekleyin:

```javascript
const knownImages = [
  '/uploads/products/çizar_salam_kaşar_sandviç.png',
  '/uploads/products/yeni_urun.png', // Yeni resim
];
```

### Adım 4: Senkronizasyonu Çalıştırın
```bash
npm run discover-images
```

## 📁 Dosya Yapısı

```
backend/
├── uploads/
│   └── products/
│       ├── çizar_salam_kaşar_sandviç.png
│       └── yeni_urun.png
├── discover-images.js      # Otomatik keşif
├── download-images-simple.js # Basit indirme
└── sync-images-manual.js   # Manuel senkronizasyon
```

## 🚀 Deploy Öncesi Kontrol Listesi

1. **Resimleri Senkronize Edin**:
   ```bash
   cd backend
   npm run discover-images
   ```

2. **Resimleri Kontrol Edin**:
   ```bash
   ls uploads/products/
   ```

3. **Git Durumunu Kontrol Edin**:
   ```bash
   git status
   ```

4. **Deploy Yapın**:
   ```bash
   # Deploy işleminizi gerçekleştirin
   ```

## ⚠️ Önemli Notlar

- Uploads klasörü `.gitignore` dosyasında yer alıyor
- Resimler git tarafından takip edilmiyor
- Deploy öncesi mutlaka senkronizasyon yapın
- Yeni resimler için `discover-images.js` dosyasını güncelleyin

## 🔍 Sorun Giderme

### Veritabanı Bağlantı Hatası
- `discover-images.js` kullanın (veritabanı gerektirmez)
- Manuel resim listesi oluşturun

### Resim Bulunamadı Hatası
- Canlı ortamda resmin var olduğunu kontrol edin
- URL'yi doğru yazdığınızdan emin olun
- Resim adındaki Türkçe karakterleri kontrol edin

### Deploy Sonrası Resimler Silindi
- `.gitignore` dosyasını kontrol edin
- Uploads klasörünün git tarafından takip edilmediğinden emin olun
- Deploy öncesi senkronizasyon yaptığınızdan emin olun

## 📞 Destek

Sorun yaşadığınızda:
1. Script çıktısını kontrol edin
2. Canlı ortamda resmin var olduğunu doğrulayın
3. Yerel dosya yollarını kontrol edin
4. Gerekirse manuel olarak resimleri kopyalayın 