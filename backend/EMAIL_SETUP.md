# Email Bildirimi Kurulum Rehberi

Bu rehber, sipariş geldiğinde email bildirimi göndermek için gerekli ayarları açıklar.

## Gmail SMTP Ayarları

### 1. Gmail App Password Oluşturma

1. Google Hesabınıza gidin: https://myaccount.google.com/
2. "Güvenlik" sekmesine tıklayın
3. "2 Adımlı Doğrulama"yı etkinleştirin
4. "Uygulama Şifreleri" bölümüne gidin
5. "Uygulama Seç" > "Diğer (Özel ad)" > "Yemek5" yazın
6. Oluşturulan 16 haneli şifreyi kopyalayın

### 2. Environment Variables Ayarlama

`.env` dosyanıza aşağıdaki değişkenleri ekleyin:

```env
# Email Ayarları
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password

# Admin email adresi (opsiyonel)
ADMIN_EMAIL=admin@yourcompany.com

# Admin panel URL (opsiyonel)
ADMIN_PANEL_URL=https://yourdomain.com/admin
```

### 3. Production Ortamında

Render veya diğer hosting platformlarında:

1. Environment variables bölümüne gidin
2. Yukarıdaki değişkenleri ekleyin
3. `EMAIL_USER` ve `EMAIL_PASS` değerlerini doğru şekilde ayarlayın

## Email Bildirimi Özellikleri

### Müşteri Email Bildirimi
- Sipariş numarası
- Şube bilgileri
- Sipariş tarihi ve tutarı
- Müşteri bilgileri
- Sipariş öğeleri listesi
- Sipariş notları

### Admin Email Bildirimi
- Yeni sipariş uyarısı
- Sipariş özeti
- Müşteri bilgileri
- Admin paneline direkt link

## Test Etme

1. Email ayarlarını yapın
2. Test siparişi oluşturun
3. Hem müşteri hem admin email'lerini kontrol edin

## Sorun Giderme

### Email Gönderilmiyor
- Gmail App Password doğru mu?
- 2 Adımlı Doğrulama etkin mi?
- Environment variables doğru ayarlanmış mı?

### Gmail Güvenlik Uyarısı
- "Daha az güvenli uygulama erişimi"ni etkinleştirin
- Veya App Password kullanın (önerilen)

## Güvenlik Notları

- App Password'ü güvenli tutun
- Production'da environment variables kullanın
- Email şifrelerini kod içinde saklamayın 