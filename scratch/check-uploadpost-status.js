const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  const settings = await prisma.setting.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  const uploadpost_api_key = settingsMap.get('uploadpost_api_key') || process.env.UPLOADPOST_API_KEY;
  if (!uploadpost_api_key) {
    console.error('No Upload-Post API key found');
    return;
  }
  
  // Latest post in db
  const latestPost = await prisma.socialPost.findFirst({
    where: { platform: 'pinterest', status: 'SENT' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!latestPost) {
    console.log('No sent social posts found');
    return;
  }
  
  const refId = latestPost.ayrshareRefId;
  console.log(`Checking status for Upload-Post job: ${refId}`);
  
  // According to docs, we check status. Let's try calling status API.
  // Wait, let's call GET /api/uploadposts/status?request_id=refId
  const url = `https://api.upload-post.com/api/uploadposts/status?request_id=${refId}`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Apikey ${uploadpost_api_key}`
    }
  });
  
  const data = await res.json();
  console.log('Status API Response:', JSON.stringify(data, null, 2));
}

checkStatus().catch(console.error).finally(() => prisma.$disconnect());
