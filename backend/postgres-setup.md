# PostgreSQL Kurulum Rehberi - Render

## 1. Render'da PostgreSQL Oluşturma

1. **Render Dashboard'a gidin**
2. **"New +" > "PostgreSQL"** seçin
3. **Database adı**: `yemek5-db`
4. **Database**: `yemek5_production`
5. **User**: `yemek5_user`
6. **Region**: En yakın bölgeyi seçin
7. **Plan**: Free (başlangıç için)

## 2. Environment Variables Ayarlama

Backend servisinizde şu environment variable'ı ekleyin:

```
DATABASE_URL=postgresql://yemek5_user:password@host:port/yemek5_production
```

**Not**: Render PostgreSQL detaylarını backend servisinizin environment variables kısmından alabilirsiniz.

## 3. Schema Güncelleme

`prisma/schema.prisma` dosyasında:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 4. Migration Çalıştırma

```bash
npx prisma migrate deploy
```

## 5. Avantajlar

- ✅ Veriler kalıcı olur
- ✅ Her deploy'da veriler korunur
- ✅ Daha güvenilir
- ✅ Production-ready

## 6. Mevcut SQLite'dan PostgreSQL'e Geçiş

Eğer mevcut verileriniz varsa:

1. **Backup alın**:
```bash
npx prisma db pull
```

2. **PostgreSQL'e migrate edin**:
```bash
npx prisma migrate deploy
```

3. **Seed data ekleyin**:
```bash
npm run deploy
``` 