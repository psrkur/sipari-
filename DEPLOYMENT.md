# 🚀 Canlıya Alma Talimatları

Bu proje için canlıya alma seçenekleri ve adımları.

## Seçenek 1: Vercel (Frontend) + Railway (Backend) - Önerilen

### Frontend (Vercel)

1. **Vercel'e gidin**: [vercel.com](https://vercel.com)
2. **GitHub ile giriş yapın**
3. **"New Project" tıklayın**
4. **Repository seçin**: GitHub repo'nuzu seçin
5. **Konfigürasyon**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `out`
   - Install Command: `npm install`

6. **Environment Variables ekleyin**:
   - `NEXT_PUBLIC_API_URL`: Backend URL'iniz (Railway'den alacaksınız)

7. **Deploy edin**

### Backend (Railway)

1. **Railway'e gidin**: [railway.app](https://railway.app)
2. **GitHub ile giriş yapın**
3. **"New Project" → "Deploy from GitHub repo"**
4. **Repository seçin**: GitHub repo'nuzu seçin
5. **Konfigürasyon**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

6. **Environment Variables ekleyin**:
   - `PORT`: `3001`
   - `DATABASE_URL`: `file:./dev.db` (SQLite için)

7. **Deploy edin**

8. **Backend URL'ini alın**: Railway dashboard'da "Deployments" → URL'i kopyalayın

9. **Frontend'i güncelleyin**: Vercel'de environment variable'ı backend URL ile güncelleyin

## Seçenek 2: Netlify (Frontend) + Render (Backend)

### Frontend (Netlify)

1. **Netlify'e gidin**: [netlify.com](https://netlify.com)
2. **"New site from Git"**
3. **GitHub repo'nuzu bağlayın**
4. **Build settings**:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/out`

5. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Backend URL

### Backend (Render)

1. **Render'e gidin**: [render.com](https://render.com)
2. **"New Web Service"**
3. **GitHub repo'nuzu bağlayın**
4. **Konfigürasyon**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Environment Variables**:
   - `PORT`: `3001`
   - `DATABASE_URL`: `file:./dev.db`

## Seçenek 3: Heroku (Full Stack)

### Heroku CLI ile

```bash
# Heroku CLI kurun
npm install -g heroku

# Login
heroku login

# App oluşturun
heroku create your-app-name

# Backend'i deploy edin
cd backend
heroku git:remote -a your-app-name
git add .
git commit -m "Backend deployment"
git push heroku main

# Frontend'i deploy edin
cd ../frontend
heroku git:remote -a your-app-name-frontend
git add .
git commit -m "Frontend deployment"
git push heroku main
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Backend (.env)
```env
PORT=3001
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-key
```

## CORS Ayarları

Backend'de CORS ayarlarını production için güncelleyin:

```javascript
// backend/server.js
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));
```

## SSL/HTTPS

- **Vercel**: Otomatik SSL
- **Railway**: Otomatik SSL
- **Netlify**: Otomatik SSL
- **Render**: Otomatik SSL

## Domain Ayarları

1. **Custom domain ekleyin** (isteğe bağlı)
2. **DNS ayarlarını yapın**
3. **SSL sertifikasını etkinleştirin**

## Monitoring ve Logs

- **Vercel**: Built-in analytics
- **Railway**: Built-in logs
- **Netlify**: Built-in analytics
- **Render**: Built-in logs

## Troubleshooting

### Build Hataları
```bash
# Frontend build hatası
cd frontend
npm install
npm run build

# Backend build hatası
cd backend
npm install
npm start
```

### CORS Hataları
Backend'de CORS origin'ini frontend URL ile güncelleyin.

### Database Hataları
SQLite dosyasının yazma izinlerini kontrol edin.

## Performance Optimizasyonu

1. **Image optimization**: Next.js otomatik optimize eder
2. **Code splitting**: Next.js otomatik yapar
3. **Caching**: Vercel/Netlify otomatik cache yapar
4. **CDN**: Tüm platformlar CDN kullanır

## Security

1. **Environment variables**: Hassas bilgileri env'de saklayın
2. **JWT secret**: Güçlü bir secret kullanın
3. **CORS**: Sadece gerekli origin'leri ekleyin
4. **Rate limiting**: Production'da rate limiting ekleyin

## Backup ve Recovery

1. **Database backup**: SQLite dosyasını düzenli yedekleyin
2. **Code backup**: GitHub'da saklayın
3. **Environment backup**: Platform dashboard'larında saklayın 