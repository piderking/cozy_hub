const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSettings() {
  const dbSettings = await prisma.setting.findMany();
  console.log('--- SYSTEM SETTINGS CONFIG ---');
  dbSettings.forEach(s => {
    console.log(`${s.key}: "${s.value}"`);
  });
  console.log('------------------------------');
}

getSettings().catch(console.error).finally(() => prisma.$disconnect());
