#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

console.log('🚀 Production Environment Setup');
console.log('===============================\n');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('📝 Environment Variables for Production:');
console.log('=======================================');
console.log(`DATABASE_URL=postgresql://your_user:your_password@your_host:5432/your_database`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('NODE_ENV=production');
console.log('PORT=10000');
console.log('FRONTEND_URL=https://siparisnet.netlify.app');
console.log('\n');

console.log('📋 Setup Instructions:');
console.log('=====================');
console.log('1. Create a PostgreSQL database on Render or any cloud provider');
console.log('2. Get the connection URL from your database provider');
console.log('3. Replace the DATABASE_URL with your actual PostgreSQL URL');
console.log('4. Add these environment variables to your Render service');
console.log('5. Redeploy your backend service');
console.log('\n');

console.log('🔧 Database Setup Commands:');
console.log('===========================');
console.log('1. npx prisma generate');
console.log('2. npx prisma db push');
console.log('3. npm start');
console.log('\n');

console.log('✅ After setup, your profile updates should work correctly!'); 