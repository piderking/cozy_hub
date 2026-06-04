const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBoardId() {
  const correctBoardId = '1114570676471315552'; // Board ID for "Cozy Hub"
  
  console.log(`Updating 'pinterest_board_id' in database to: ${correctBoardId}`);
  
  await prisma.setting.upsert({
    where: { key: 'pinterest_board_id' },
    update: { value: correctBoardId },
    create: { key: 'pinterest_board_id', value: correctBoardId }
  });
  
  console.log('Pinterest Board ID updated successfully in the database!');
}

updateBoardId().catch(console.error).finally(() => prisma.$disconnect());
