import { apiRequest } from './queryClient';
import { useState, useEffect } from 'react';

// Supported languages for the platform
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸', code: 'en' },
  es: { name: 'Español', flag: '🇪🇸', code: 'es' },
  fr: { name: 'Français', flag: '🇫🇷', code: 'fr' },
  de: { name: 'Deutsch', flag: '🇩🇪', code: 'de' },
  it: { name: 'Italiano', flag: '🇮🇹', code: 'it' },
  pt: { name: 'Português', flag: '🇧🇷', code: 'pt' },
  zh: { name: '中文', flag: '🇨🇳', code: 'zh' },
  ja: { name: '日本語', flag: '🇯🇵', code: 'ja' },
  ko: { name: '한국어', flag: '🇰🇷', code: 'ko' },
  ar: { name: 'العربية', flag: '🇸🇦', code: 'ar' },
  hi: { name: 'हिन्दी', flag: '🇮🇳', code: 'hi' },
  ru: { name: 'Русский', flag: '🇷🇺', code: 'ru' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Language context management
class LanguageManager {
  private currentLanguage: SupportedLanguage = 'en';
  private translationCache = new Map<string, Map<SupportedLanguage, string>>();

  constructor() {
    // Load saved language preference
    const saved = localStorage.getItem('cirqlback-language');
    if (saved && saved in SUPPORTED_LANGUAGES) {
      this.currentLanguage = saved as SupportedLanguage;
    }
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  setLanguage(language: SupportedLanguage) {
    this.currentLanguage = language;
    localStorage.setItem('cirqlback-language', language);
    
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
  }

  async translateText(text: string, targetLanguage?: SupportedLanguage): Promise<string> {
    const target = targetLanguage || this.currentLanguage;
    
    // Return original text if it's already in English and target is English
    if (target === 'en') {
      return text;
    }

    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    if (this.translationCache.has(cacheKey)) {
      const translations = this.translationCache.get(cacheKey)!;
      if (translations.has(target)) {
        return translations.get(target)!;
      }
    }

    try {
      const response = await apiRequest('POST', '/api/translate/text', {
        text,
        targetLanguage: target,
        sourceLanguage: 'en'
      });

      const data = await response.json();
      const translatedText = data.translatedText;

      // Cache the translation
      if (!this.translationCache.has(cacheKey)) {
        this.translationCache.set(cacheKey, new Map());
      }
      this.translationCache.get(cacheKey)!.set(target, translatedText);

      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on error
    }
  }

  async translateLiveVoice(audioBlob: Blob, targetLanguage?: SupportedLanguage): Promise<{
    originalText: string;
    translatedText: string;
    audioUrl?: string;
  }> {
    const target = targetLanguage || this.currentLanguage;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('targetLanguage', target);

      const response = await fetch('/api/translate/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Voice translation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Voice translation failed:', error);
      throw error;
    }
  }
}

export const languageManager = new LanguageManager();

// React hook for language management
export function useLanguage() {
  const [currentLanguage, setCurrentLanguageState] = useState(
    languageManager.getCurrentLanguage()
  );

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<SupportedLanguage>) => {
      setCurrentLanguageState(event.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  const setLanguage = (language: SupportedLanguage) => {
    languageManager.setLanguage(language);
  };

  const translateText = (text: string, targetLanguage?: SupportedLanguage) => {
    return languageManager.translateText(text, targetLanguage);
  };

  const translateVoice = (audioBlob: Blob, targetLanguage?: SupportedLanguage) => {
    return languageManager.translateLiveVoice(audioBlob, targetLanguage);
  };

  return {
    currentLanguage,
    setLanguage,
    translateText,
    translateVoice,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

// Translation component for automatic text translation
export function TranslatedText({ 
  children, 
  targetLanguage 
}: { 
  children: string; 
  targetLanguage?: SupportedLanguage;
}) {
  const [translatedText, setTranslatedText] = useState(children);
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    const target = targetLanguage || currentLanguage;
    if (target === 'en') {
      setTranslatedText(children);
      return;
    }

    languageManager.translateText(children, target).then(setTranslatedText);
  }, [children, currentLanguage, targetLanguage]);

  return translatedText;
}