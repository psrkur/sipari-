@echo off

echo 🍔 FastFood Hızlı Satış Uygulaması Kurulumu
echo ==============================================

REM Ana bağımlılıkları yükle
echo 📦 Ana bağımlılıklar yükleniyor...
npm install

REM Backend kurulumu
echo 🔧 Backend kurulumu...
cd backend
npm install

REM .env dosyası oluştur
if not exist .env (
    echo 📝 .env dosyası oluşturuluyor...
    copy env.example .env
)

REM Veritabanını oluştur
echo 🗄️ Veritabanı oluşturuluyor...
npx prisma migrate dev --name init

REM Frontend kurulumu
echo 🎨 Frontend kurulumu...
cd ..\frontend
npm install

REM Ana dizine dön
cd ..

echo ✅ Kurulum tamamlandı!
echo.
echo 🚀 Uygulamayı başlatmak için:
echo    npm run dev
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
echo.
echo 👤 Admin girişi:
echo    Email: admin@fastfood.com
echo    Şifre: admin123

pause 