const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.socialPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { product: true }
  });
  console.log('--- RECENT SOCIAL POSTS ---');
  posts.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Product: ${p.product.title}`);
    console.log(`Platform: ${p.platform}`);
    console.log(`Status: ${p.status}`);
    console.log(`AyrshareRefId: ${p.ayrshareRefId}`);
    console.log(`Created: ${p.createdAt}`);
    console.log(`Content (first 100 chars): ${p.generatedContent.substring(0, 100)}...`);
    console.log('---------------------------');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
