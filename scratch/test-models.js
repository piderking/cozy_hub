const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const dbSetting = await prisma.setting.findUnique({
    where: { key: 'gemini_api_key' },
  });
  
  if (!dbSetting || !dbSetting.value) {
    console.error('Gemini API key is not configured in settings!');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: dbSetting.value });
  try {
    const list = await ai.models.list();
    console.log('List keys:', Object.keys(list));
    console.log('List structure:', JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('Failed to list models:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
