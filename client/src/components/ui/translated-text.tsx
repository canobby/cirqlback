import { useState, useEffect } from 'react';
import { useLanguage, type SupportedLanguage } from '@/lib/translation';

interface TranslatedTextProps {
  children: string;
  className?: string;
  targetLanguage?: SupportedLanguage;
}

export function TranslatedText({ 
  children, 
  className = "",
  targetLanguage 
}: TranslatedTextProps) {
  const [translatedText, setTranslatedText] = useState(children);
  const [isLoading, setIsLoading] = useState(false);
  const { currentLanguage, translateText } = useLanguage();

  useEffect(() => {
    const target = targetLanguage || currentLanguage;
    
    // If English, return original text
    if (target === 'en') {
      setTranslatedText(children);
      return;
    }

    // Translate text
    setIsLoading(true);
    translateText(children, target)
      .then(translated => {
        setTranslatedText(translated);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Translation failed:', error);
        setTranslatedText(children); // Fallback to original
        setIsLoading(false);
      });
  }, [children, currentLanguage, targetLanguage, translateText]);

  if (isLoading) {
    return <span className={`${className} opacity-70`}>{children}</span>;
  }

  return <span className={className}>{translatedText}</span>;
}

// Simple translation dictionary for common UI elements
const UI_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "Customer": {
    en: "Customer",
    es: "Cliente", 
    fr: "Client",
    de: "Kunde",
    it: "Cliente",
    pt: "Cliente",
    zh: "客户",
    ja: "顧客",
    ko: "고객",
    ar: "عميل",
    hi: "ग्राहक",
    ru: "Клиент"
  },
  "Merchant": {
    en: "Merchant",
    es: "Comerciante",
    fr: "Commerçant", 
    de: "Händler",
    it: "Commerciante",
    pt: "Comerciante",
    zh: "商家",
    ja: "商人",
    ko: "상인",
    ar: "تاجر",
    hi: "व्यापारी",
    ru: "Торговец"
  },
  "Analytics": {
    en: "Analytics",
    es: "Análisis",
    fr: "Analyses",
    de: "Analytik",
    it: "Analisi",
    pt: "Análises",
    zh: "分析",
    ja: "分析",
    ko: "분석",
    ar: "تحليلات",
    hi: "विश्लेषण",
    ru: "Аналитика"
  },
  "Map": {
    en: "Map",
    es: "Mapa",
    fr: "Carte",
    de: "Karte", 
    it: "Mappa",
    pt: "Mapa",
    zh: "地图",
    ja: "地図",
    ko: "지도",
    ar: "خريطة",
    hi: "मानचित्र",
    ru: "Карта"
  },
  "Login": {
    en: "Login",
    es: "Iniciar sesión",
    fr: "Connexion",
    de: "Anmelden",
    it: "Accedi",
    pt: "Entrar",
    zh: "登录",
    ja: "ログイン",
    ko: "로그인",
    ar: "تسجيل الدخول",
    hi: "लॉगिन",
    ru: "Войти"
  },
  "All Pages": {
    en: "All Pages",
    es: "Todas las páginas",
    fr: "Toutes les pages",
    de: "Alle Seiten",
    it: "Tutte le pagine", 
    pt: "Todas as páginas",
    zh: "所有页面",
    ja: "すべてのページ",
    ko: "모든 페이지",
    ar: "جميع الصفحات",
    hi: "सभी पृष्ठ",
    ru: "Все страницы"
  }
};

// Quick translate component for static UI text
export function QuickTranslate({ text, className = "" }: { text: string; className?: string }) {
  const { currentLanguage } = useLanguage();
  
  const translated = UI_TRANSLATIONS[text]?.[currentLanguage] || text;
  
  return <span className={className}>{translated}</span>;
}