# Render Deploy Hook

## Manuel Deploy için:

1. Render.com paneline gidin
2. Projenizi seçin
3. **Settings** → **Build & Deploy** → **Build Hooks**
4. **Create Build Hook** → **Manual Deploy**
5. Bu URL'i kullanarak manuel deploy yapın

## Build Komutları:

```bash
npm install
npx prisma generate
npx prisma db push --accept-data-loss --force-reset
```

## Start Komutu:

```bash
node server.js
```

## Environment Variables:

- `DATABASE_URL` = `file:./dev.db`
- `JWT_SECRET` = `your-super-secret-jwt-key-change-this-in-production`
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `FRONTEND_URL` = `https://siparisnet.netlify.app`

## Test URL:

https://yemek5-backend.onrender.com/api/branches 