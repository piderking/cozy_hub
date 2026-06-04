const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getBoards() {
  const settings = await prisma.setting.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  const uploadpost_api_key = settingsMap.get('uploadpost_api_key') || process.env.UPLOADPOST_API_KEY;
  if (!uploadpost_api_key) {
    console.error('No Upload-Post API key found in database settings');
    return;
  }
  
  console.log('Fetching Pinterest boards from Upload-Post API...');
  const url = 'https://api.upload-post.com/api/uploadposts/pinterest/boards';
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Apikey ${uploadpost_api_key}`
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP error ${res.status}: ${text}`);
      return;
    }
    
    const data = await res.json();
    console.log('\n--- AVAILABLE PINTEREST BOARDS ---');
    if (Array.isArray(data)) {
      data.forEach(board => {
        console.log(`Board Name: "${board.name}"`);
        console.log(`Numeric Board ID: ${board.id}`);
        console.log('---------------------------');
      });
    } else {
      console.log('API Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Failed to fetch boards:', err.message);
  }
}

getBoards().catch(console.error).finally(() => prisma.$disconnect());
