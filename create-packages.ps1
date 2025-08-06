Write-Host "GuzelHosting upload paketleri hazirlaniyor..." -ForegroundColor Green

# Backend paketi
Write-Host "Backend paketi hazirlaniyor..." -ForegroundColor Yellow
Compress-Archive -Path "backend/server.js", "backend/package.json", "backend/prisma", "backend/middleware", "backend/utils", "backend/integrations", "backend/backups/database-backup.zip" -DestinationPath "backend-package.zip" -Force

# Frontend paketi  
Write-Host "Frontend paketi hazirlaniyor..." -ForegroundColor Yellow
Compress-Archive -Path "frontend/package.json", "frontend/next.config.js", "frontend/tailwind.config.js", "frontend/tsconfig.json", "frontend/app", "frontend/components", "frontend/lib", "frontend/store", "frontend/hooks" -DestinationPath "frontend-package.zip" -Force

# Ana proje paketi
Write-Host "Ana proje paketi hazirlaniyor..." -ForegroundColor Yellow
Compress-Archive -Path "package.json", "deploy.sh", "render.yaml" -DestinationPath "main-package.zip" -Force

# Veritabanı paketi
Write-Host "Veritabani paketi hazirlaniyor..." -ForegroundColor Yellow
Copy-Item "backend/backups/database-backup.zip" -Destination "database-package.zip"

Write-Host "Tum paketler hazirlandi!" -ForegroundColor Green
Write-Host "backend-package.zip" -ForegroundColor White
Write-Host "frontend-package.zip" -ForegroundColor White  
Write-Host "main-package.zip" -ForegroundColor White
Write-Host "database-package.zip" -ForegroundColor White 