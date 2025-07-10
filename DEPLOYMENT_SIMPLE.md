# 🚀 Basit Canlıya Alma Talimatları

## Seçenek 1: Netlify (Frontend) + Render (Backend) - En Kolay

### Adım 1: Backend'i Render'a Deploy Edin

1. **Render.com'a gidin** ve hesap oluşturun
2. **"New +" → "Web Service"** tıklayın
3. **GitHub repo'nuzu bağlayın**
4. **Konfigürasyon:**
   - Name: `yemek5-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Environment Variables ekleyin:**
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: `file:./dev.db`
   - `JWT_SECRET`: `your-super-secret-jwt-key-change-this-in-production`
6. **"Create Web Service"** tıklayın
7. **Backend URL'ini kopyalayın** (örn: `https://yemek5-backend.onrender.com`)

### Adım 2: Frontend'i Netlify'a Deploy Edin

1. **Netlify.com'a gidin** ve hesap oluşturun
2. **"New site from Git"** tıklayın
3. **GitHub repo'nuzu seçin**
4. **Konfigürasyon:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `out`
5. **Environment Variables ekleyin:**
   - `NEXT_PUBLIC_API_URL`: Backend URL'iniz (Render'dan aldığınız)
6. **"Deploy site"** tıklayın

### Adım 3: CORS Ayarlarını Güncelleyin

Backend deploy olduktan sonra, `backend/server.js` dosyasında CORS ayarlarını güncelleyin:

```javascript
app.use(cors({
  origin: ['https://your-netlify-site.netlify.app'],
  credentials: true
}));
```

## Seçenek 2: Vercel (Frontend) + Railway (Backend)

### Backend (Railway):
1. Railway.app'e gidin
2. GitHub repo'nuzu bağlayın
3. Root directory: `backend`
4. Environment variables ekleyin
5. Deploy edin

### Frontend (Vercel):
1. Vercel.com'a gidin
2. GitHub repo'nuzu bağlayın
3. Root directory: `frontend`
4. Environment variables ekleyin
5. Deploy edin

## Hızlı Test

Deploy işlemi tamamlandıktan sonra:

1. **Frontend URL'inizi açın**
2. **Admin paneline giriş yapın:**
   - Email: `admin@example.com`
   - Şifre: `admin123`
3. **Test siparişi oluşturun**
4. **Tüm özellikleri test edin**

## Sorun Giderme

- **CORS Hatası**: Backend'de CORS ayarlarını kontrol edin
- **API Bağlantı Hatası**: Environment variables'ları kontrol edin
- **Build Hatası**: Node.js versiyonunu kontrol edin

## Notlar

- **Ücretsiz Planlar**: Render ve Netlify'ın ücretsiz planları yeterli
- **Database**: SQLite kullanıyoruz, production'da PostgreSQL'e geçebilirsiniz
- **Domain**: Kendi domain'inizi ekleyebilirsiniz 