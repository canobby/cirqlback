import OpenAI from "openai";
import { Request, Response } from "express";

// Lazily construct the OpenAI client so the server can boot without an
// OPENAI_API_KEY. Translation endpoints only fail (with a clear message) if
// actually called without a key, rather than crashing the server at startup.
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable must be set to use AI features");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}
const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIClient();
    const value = Reflect.get(client as any, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Language mapping for OpenAI
const LANGUAGE_MAPPING: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French', 
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
};

export class TranslationService {
  
  // Translate text using OpenAI
  async translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en'): Promise<string> {
    try {
      const targetLangName = LANGUAGE_MAPPING[targetLanguage] || targetLanguage;
      const sourceLangName = LANGUAGE_MAPPING[sourceLanguage] || sourceLanguage;

      const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
      
      Important context: This is for a local business discovery platform called "Cirqlback" that helps customers find rewards and adventures at local businesses through NFC taps. The translation should:
      - Maintain the exciting, adventure-focused tone
      - Preserve any platform-specific terms like "Cirql tags", "Cirql tap", etc.
      - Keep the gaming and treasure-hunting language engaging
      - Be culturally appropriate for the target language
      
      Text to translate: "${text}"
      
      Provide only the translation, no additional commentary:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are a professional translator specializing in marketing content for local business platforms. Provide accurate, culturally-appropriate translations that maintain the original tone and excitement." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      return response.choices[0].message.content?.trim() || text;
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error('Translation service unavailable');
    }
  }

  // Transcribe and translate voice
  async translateVoice(audioBuffer: Buffer, targetLanguage: string): Promise<{
    originalText: string;
    translatedText: string;
    audioUrl?: string;
  }> {
    try {
      // First, transcribe the audio to text
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'en', // Source language
      });

      const originalText = transcription.text;

      // Then translate the text
      const translatedText = await this.translateText(originalText, targetLanguage);

      // Generate speech for the translated text
      const speechResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: translatedText,
      });

      // Convert speech response to buffer for audio URL
      const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
      const audioUrl = `data:audio/mp3;base64,${speechBuffer.toString('base64')}`;

      return {
        originalText,
        translatedText,
        audioUrl,
      };
    } catch (error) {
      console.error('Voice translation failed:', error);
      throw new Error('Voice translation service unavailable');
    }
  }

  // Generate speech from text
  async textToSpeech(text: string, language: string = 'en'): Promise<Buffer> {
    try {
      // Select appropriate voice based on language
      const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
        en: 'alloy',
        es: 'nova',
        fr: 'shimmer',
        de: 'echo',
        it: 'fable',
        pt: 'onyx',
        zh: 'alloy',
        ja: 'nova',
        ko: 'shimmer',
        ar: 'onyx',
        hi: 'alloy',
        ru: 'echo',
      };

      const voice = voiceMap[language] || 'alloy';

      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      throw new Error('Text-to-speech service unavailable');
    }
  }
}

export const translationService = new TranslationService();

// Route handlers
export async function handleTextTranslation(req: Request, res: Response) {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    const translatedText = await translationService.translateText(text, targetLanguage, sourceLanguage);
    
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
}

export async function handleVoiceTranslation(req: Request, res: Response) {
  try {
    const { targetLanguage } = req.body;
    const audioFile = req.file;

    if (!audioFile || !targetLanguage) {
      return res.status(400).json({ error: 'Audio file and target language are required' });
    }

    const result = await translationService.translateVoice(audioFile.buffer, targetLanguage);
    
    res.json(result);
  } catch (error) {
    console.error('Voice translation error:', error);
    res.status(500).json({ error: 'Voice translation failed' });
  }
}

export async function handleTextToSpeech(req: Request, res: Response) {
  try {
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await translationService.textToSpeech(text, language);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
}