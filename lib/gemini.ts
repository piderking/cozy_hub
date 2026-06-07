import { GoogleGenAI } from '@google/genai';

interface GenerateOptions {
  apiKey: string;
  prompt: string;
  responseMimeType?: string;
  images?: {
    mimeType: string;
    data: string; // Base64 clean string
  }[];
}

/**
 * Generates content using Gemini with automatic exponential backoff retries and fallback models.
 * This is designed to gracefully handle transient 503 (spikes in demand) and 429 (rate limits) errors.
 */
export async function generateContentWithRetry(options: GenerateOptions): Promise<{ text: string }> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  
  // Model priorities: standard model, fallback Gemini 3 Flash models, other fallbacks
  const models = [
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
  ];
  const maxRetries = 3;
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini] Calling ${model} (attempt ${attempt}/${maxRetries})...`);
        
        const parts: any[] = [{ text: options.prompt }];
        
        if (options.images && options.images.length > 0) {
          options.images.forEach(img => {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data
              }
            });
          });
        }

        const payload: any = {
          model,
          contents: [
            { role: 'user', parts }
          ]
        };

        if (options.responseMimeType) {
          payload.config = {
            responseMimeType: options.responseMimeType
          };
        }

        const response = await ai.models.generateContent(payload);
        const responseText = response.text;
        
        if (responseText) {
          console.log(`[Gemini] Successful response from model: ${model}`);
          return { text: responseText };
        }
        
        throw new Error('Empty response returned from model.');
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || '';
        console.warn(`[Gemini] Error on ${model} (attempt ${attempt}):`, errorMessage);

        // Check if the error is a transient/retryable one (503 Service Unavailable, 429 Rate Limit)
        const isUnavailable = errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('demand');
        const isRateLimited = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('limit');

        if (isUnavailable || isRateLimited) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2000ms, 4000ms...
            console.log(`[Gemini] Transient error, retrying same model in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry same model
          }
        } else {
          // If it's a non-transient error (e.g. 400 Bad Request, API key failure), fail immediately
          throw error;
        }
      }
    }
    console.log(`[Gemini] Model ${model} failed after all retries. Attempting fallback model...`);
  }

  throw lastError || new Error('All Gemini models and retries failed.');
}
