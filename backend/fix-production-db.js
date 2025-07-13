#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔧 Production Database Fix');
console.log('=========================\n');

// Generate secure JWT secret
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('❌ CURRENT PROBLEM:');
console.log('Production is using SQLite (file:./dev.db) but schema is PostgreSQL');
console.log('This causes 500 errors on profile updates and other database operations\n');

console.log('✅ SOLUTION:');
console.log('1. Create PostgreSQL database on Render');
console.log('2. Update environment variables');
console.log('3. Redeploy backend\n');

console.log('📋 STEP-BY-STEP FIX:');
console.log('=====================\n');

console.log('1️⃣ CREATE POSTGRESQL DATABASE ON RENDER:');
console.log('   - Go to https://dashboard.render.com');
console.log('   - Click "New" → "PostgreSQL"');
console.log('   - Name: yemek5-database');
console.log('   - Database: yemek5_db');
console.log('   - User: yemek5_user');
console.log('   - Region: Frankfurt (Europe)');
console.log('   - PostgreSQL Version: 15\n');

console.log('2️⃣ GET DATABASE URL:');
console.log('   - After creating database, copy the "External Database URL"');
console.log('   - It looks like: postgresql://user:password@host:port/database\n');

console.log('3️⃣ UPDATE BACKEND ENVIRONMENT VARIABLES:');
console.log('   - Go to your backend service on Render');
console.log('   - Click "Environment" tab');
console.log('   - Add/Update these variables:\n');

console.log('   DATABASE_URL = [Your PostgreSQL URL from step 2]');
console.log(`   JWT_SECRET = ${jwtSecret}`);
console.log('   NODE_ENV = production');
console.log('   PORT = 10000');
console.log('   FRONTEND_URL = https://siparisnet.netlify.app\n');

console.log('4️⃣ REDEPLOY BACKEND:');
console.log('   - Go to "Manual Deploy" tab');
console.log('   - Click "Deploy latest commit"');
console.log('   - Wait for deployment to complete\n');

console.log('5️⃣ VERIFY FIX:');
console.log('   - Check deployment logs for any errors');
console.log('   - Test profile update functionality');
console.log('   - Should work without 500 errors\n');

console.log('🔍 TROUBLESHOOTING:');
console.log('==================');
console.log('If still getting 500 errors:');
console.log('1. Check Render logs for specific error messages');
console.log('2. Verify DATABASE_URL is correct');
console.log('3. Ensure database is accessible');
console.log('4. Check if Prisma migrations ran successfully\n');

console.log('📞 NEED HELP?');
console.log('=============');
console.log('If you need help with any step, let me know!');
console.log('I can guide you through the process.\n');

console.log('✅ After completing these steps, profile updates will work correctly!'); 