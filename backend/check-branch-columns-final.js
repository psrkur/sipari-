const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBranchColumns() {
  try {
    console.log('Checking branches table columns...');
    
    // Check the actual column names in the branches table
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'branches'
      ORDER BY ordinal_position;
    `;
    
    console.log('Branches table columns:');
    console.log(JSON.stringify(columns, null, 2));
    
    // Also check if we can query the table directly
    console.log('\nTrying to query branches table...');
    const branches = await prisma.$queryRaw`SELECT * FROM branches LIMIT 1`;
    console.log('Sample branch data:', JSON.stringify(branches, null, 2));
    
  } catch (error) {
    console.error('Error checking branches table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchColumns(); 