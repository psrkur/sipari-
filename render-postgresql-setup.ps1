# Render PostgreSQL Kurulum Script'i
# PowerShell Script

Write-Host "🚀 Render PostgreSQL Kurulum Script'i" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# PostgreSQL URL'sini al
Write-Host "📝 PostgreSQL URL'sini girin:" -ForegroundColor Yellow
Write-Host "Örnek: postgresql://yemek5_user:password@host:port/yemek5_db" -ForegroundColor Gray
$databaseUrl = Read-Host "DATABASE_URL"

# JWT Secret oluştur
$jwtSecret = -join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Frontend URL'sini al
Write-Host "🌐 Frontend URL'sini girin:" -ForegroundColor Yellow
Write-Host "Örnek: https://your-frontend-domain.com" -ForegroundColor Gray
$frontendUrl = Read-Host "FRONTEND_URL"

Write-Host ""
Write-Host "📋 Environment Variables:" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "DATABASE_URL=$databaseUrl" -ForegroundColor Green
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Green
Write-Host "NODE_ENV=production" -ForegroundColor Green
Write-Host "FRONTEND_URL=$frontendUrl" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Bu değerleri Render Dashboard'da environment variables olarak ekleyin:" -ForegroundColor Yellow
Write-Host "1. Backend servisinize gidin" -ForegroundColor White
Write-Host "2. Environment sekmesine tıklayın" -ForegroundColor White
Write-Host "3. Environment Variables bölümünde yukarıdaki değerleri ekleyin" -ForegroundColor White
Write-Host "4. Save butonuna tıklayın" -ForegroundColor White
Write-Host "5. Servisi yeniden başlatın" -ForegroundColor White

Write-Host ""
Write-Host "🔗 Render Dashboard: https://dashboard.render.com" -ForegroundColor Blue
Write-Host "📊 Health Check: https://yemek5-backend.onrender.com/health" -ForegroundColor Blue

Write-Host ""
Write-Host "🎯 Kurulum tamamlandıktan sonra test edin:" -ForegroundColor Yellow
Write-Host "curl https://yemek5-backend.onrender.com/health" -ForegroundColor Gray 