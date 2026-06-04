const { GoogleGenAI } = require('@google/genai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Please configure the GEMINI_API_KEY environment variable to run this test.');
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log('Sending test request to models.generateImages...');
    const imageResponse = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: 'A cozy minimalist lamp on a wooden table, warm light, photorealistic',
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });
    console.log('Success with model imagen-3.0-generate-002!');
    console.log('Generated images count:', imageResponse.generatedImages?.length);
  } catch (err3) {
    console.error('Failed with imagen-3.0-generate-002:', err3.message);
    
    try {
      console.log('Retrying with imagen-4.0-generate-001...');
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: 'A cozy minimalist lamp on a wooden table, warm light, photorealistic',
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
      });
      console.log('Success with model imagen-4.0-generate-001!');
      console.log('Generated images count:', imageResponse.generatedImages?.length);
    } catch (err4) {
      console.error('Failed with imagen-4.0-generate-001:', err4.message);
    }
  }
}

test();
