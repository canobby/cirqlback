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
    es: "Cliente"
  },
  "Merchant": {
    en: "Merchant",
    es: "Comerciante"
  },
  "Analytics": {
    en: "Analytics",
    es: "Análisis"
  },
  "Map": {
    en: "Map",
    es: "Mapa"
  },
  "Login": {
    en: "Login",
    es: "Iniciar sesión"
  },
  "All Pages": {
    en: "All Pages",
    es: "Todas las páginas"
  },
  "Home": {
    en: "Home",
    es: "Inicio"
  },
  "Dashboard": {
    en: "Dashboard", 
    es: "Panel de control"
  },
  "The Addictive Local Discovery Platform": {
    en: "The Addictive Local Discovery Platform",
    es: "La Plataforma Adictiva de Descubrimiento Local"
  },
  "Transform every business visit into an exciting adventure through gamified local discovery": {
    en: "Transform every business visit into an exciting adventure through gamified local discovery",
    es: "Transforma cada visita a un negocio en una aventura emocionante a través del descubrimiento local gamificado"
  },
  "tap, collect, compete, and earn real rewards": {
    en: "tap, collect, compete, and earn real rewards",
    es: "toca, colecciona, compite y gana recompensas reales"
  },
  "Get Started": {
    en: "Get Started",
    es: "Comenzar"
  },
  "Explore Map": {
    en: "Explore Map",
    es: "Explorar mapa"
  },
  "Business Solutions": {
    en: "Business Solutions", 
    es: "Soluciones empresariales"
  },
  "Join Community": {
    en: "Join Community",
    es: "Unirse a la comunidad"
  },
  "Choose Your Experience": {
    en: "Choose Your Experience",
    es: "Elige tu experiencia"
  },
  "I'm a Customer": {
    en: "I'm a Customer",
    es: "Soy un cliente"
  },
  "I'm a Business": {
    en: "I'm a Business",
    es: "Soy un negocio"
  },
  "Discover amazing local businesses, earn rewards, and compete with friends in your neighborhood.": {
    en: "Discover amazing local businesses, earn rewards, and compete with friends in your neighborhood.",
    es: "Descubre negocios locales increíbles, gana recompensas y compite con amigos en tu vecindario."
  },
  "Attract more customers, increase engagement, and grow your local presence with gamified marketing.": {
    en: "Attract more customers, increase engagement, and grow your local presence with gamified marketing.",
    es: "Atrae más clientes, aumenta el compromiso y haz crecer tu presencia local con marketing gamificado."
  },
  "How It Works": {
    en: "How It Works",
    es: "Cómo funciona"
  },
  "Three simple steps to start your local discovery adventure": {
    en: "Three simple steps to start your local discovery adventure",
    es: "Tres simples pasos para comenzar tu aventura de descubrimiento local"
  },
  "Tap & Earn": {
    en: "Tap & Earn",
    es: "Toca y gana"
  },
  "Smart Campaigns": {
    en: "Smart Campaigns", 
    es: "Campañas inteligentes"
  },
  "Local Discovery": {
    en: "Local Discovery",
    es: "Descubrimiento local"
  },
  "Simply tap Cirql tags to unlock instant rewards": {
    en: "Simply tap Cirql tags to unlock instant rewards",
    es: "Simplemente toca las etiquetas Cirql para desbloquear recompensas instantáneas"
  },
  "AI-powered marketing that drives real results": {
    en: "AI-powered marketing that drives real results",
    es: "Marketing impulsado por IA que genera resultados reales"
  },
  "Explore hidden gems in your neighborhood": {
    en: "Explore hidden gems in your neighborhood",
    es: "Explora joyas ocultas en tu vecindario"
  },
  "Reward Unlocked!": {
    en: "Reward Unlocked!",
    es: "¡Recompensa desbloqueada!"
  },
  "Joe's Coffee Shop": {
    en: "Joe's Coffee Shop",
    es: "Cafetería de Joe"
  },
  "Free Coffee": {
    en: "Free Coffee",
    es: "Café gratis"
  },
  "Today Only": {
    en: "Today Only",
    es: "Solo hoy"
  },
  "pts": {
    en: "pts",
    es: "pts"
  },
  "Expires in 2 hours": {
    en: "Expires in 2 hours",
    es: "Expira en 2 horas"
  },
  "Level": {
    en: "Level",
    es: "Nivel"
  },
  "Total Points": {
    en: "Total Points",
    es: "Puntos totales"
  },
  "Your Rewards": {
    en: "Your Rewards",
    es: "Tus recompensas"
  },
  "Platform Stats": {
    en: "Platform Stats",
    es: "Estadísticas de la plataforma"
  },
  "Businesses": {
    en: "Businesses",
    es: "Negocios"
  },
  "Customers": {
    en: "Customers",
    es: "Clientes"
  },
  "Rewards Claimed": {
    en: "Rewards Claimed",
    es: "Recompensas reclamadas"
  },
  "Cities": {
    en: "Cities",
    es: "Ciudades"
  },
  "Start Your Adventure": {
    en: "Start Your Adventure",
    es: "Comienza tu aventura"
  },
  "Ready to discover amazing local businesses and earn rewards?": {
    en: "Ready to discover amazing local businesses and earn rewards?",
    es: "¿Listo para descubrir negocios locales increíbles y ganar recompensas?"
  },
  "Gamified Rewards": {
    en: "Gamified Rewards",
    es: "Recompensas gamificadas"
  },
  "Collect points, unlock achievements, and compete with friends while discovering amazing local businesses.": {
    en: "Collect points, unlock achievements, and compete with friends while discovering amazing local businesses.",
    es: "Colecciona puntos, desbloquea logros y compite con amigos mientras descubres increíbles negocios locales."
  },
  "Daily challenges & quests": {
    en: "Daily challenges & quests",
    es: "Desafíos y misiones diarias"
  },
  "Level progression system": {
    en: "Level progression system", 
    es: "Sistema de progresión de niveles"
  },
  "Exclusive member rewards": {
    en: "Exclusive member rewards",
    es: "Recompensas exclusivas para miembros"
  },
  "Growing Fast": {
    en: "Growing Fast",
    es: "Crecimiento rápido"
  },
  "Addictive": {
    en: "Addictive",
    es: "Adictivo"
  },
  "Explorer": {
    en: "Explorer",
    es: "Explorador"
  },
  "Community Love": {
    en: "Community Love",
    es: "Amor de la comunidad"
  },
  "Join the Movement": {
    en: "Join the Movement",
    es: "Únete al movimiento"
  },
  "Thousands of businesses and customers are already part of the Cirqlback community.": {
    en: "Thousands of businesses and customers are already part of the Cirqlback community.",
    es: "Miles de negocios y clientes ya son parte de la comunidad Cirqlback."
  },
  "Love discovering new places and earning rewards!": {
    en: "Love discovering new places and earning rewards!",
    es: "¡Me encanta descubrir nuevos lugares y ganar recompensas!"
  },
  "Sarah M.": {
    en: "Sarah M.",
    es: "Sarah M."
  },
  "Get Started Today": {
    en: "Get Started Today",
    es: "Comienza hoy"
  },
  "Download": {
    en: "Download",
    es: "Descargar"
  },
  "Experience": {
    en: "Experience",
    es: "Experiencia"
  },
  "Download the Cirqlback app and start your local discovery adventure today.": {
    en: "Download the Cirqlback app and start your local discovery adventure today.",
    es: "Descarga la aplicación Cirqlback y comienza tu aventura de descubrimiento local hoy."
  },
  "Tap a Cirql tag at any participating business to unlock instant rewards and start earning.": {
    en: "Tap a Cirql tag at any participating business to unlock instant rewards and start earning.",
    es: "Toca una etiqueta Cirql en cualquier negocio participante para desbloquear recompensas instantáneas y comenzar a ganar."
  },
  "Ready to Start?": {
    en: "Ready to Start?",
    es: "¿Listo para comenzar?"
  },
  "Find Businesses": {
    en: "Find Businesses",
    es: "Encontrar negocios"
  },
  "My Rewards": {
    en: "My Rewards",
    es: "Mis recompensas"
  },
  "Business Portal": {
    en: "Business Portal",
    es: "Portal de negocios"
  },
  "NFC Setup": {
    en: "NFC Setup",
    es: "Configuración NFC"
  },
  "About Cirqlback": {
    en: "About Cirqlback",
    es: "Acerca de Cirqlback"
  },
  "Making local discovery addictively fun.": {
    en: "Making local discovery addictively fun.",
    es: "Haciendo que el descubrimiento local sea adictivamente divertido."
  },
  "The revolutionary NFC-powered local marketing platform connecting customers with businesses through seamless tap-to-reward experiences.": {
    en: "The revolutionary NFC-powered local marketing platform connecting customers with businesses through seamless tap-to-reward experiences.",
    es: "La plataforma revolucionaria de marketing local impulsada por NFC que conecta clientes con negocios a través de experiencias perfectas de tocar para recompensar."
  },
  "Platform": {
    en: "Platform",
    es: "Plataforma"
  },
  "Support": {
    en: "Support", 
    es: "Soporte"
  },
  "Customer Experience": {
    en: "Customer Experience",
    es: "Experiencia del cliente"
  },
  "Merchant Dashboard": {
    en: "Merchant Dashboard",
    es: "Panel de comerciante"
  },
  "Analytics Suite": {
    en: "Analytics Suite",
    es: "Suite de análisis"
  },
  "Community Hub": {
    en: "Community Hub",
    es: "Centro de comunidad"
  },
  "Help Center": {
    en: "Help Center",
    es: "Centro de ayuda"
  },
  "Documentation": {
    en: "Documentation",
    es: "Documentación"
  },
  "Contact Us": {
    en: "Contact Us",
    es: "Contáctanos"
  },
  "System Status": {
    en: "System Status",
    es: "Estado del sistema"
  },
  "All rights reserved.": {
    en: "All rights reserved.",
    es: "Todos los derechos reservados."
  },
  "Privacy Policy": {
    en: "Privacy Policy",
    es: "Política de privacidad"
  },
  "Terms of Service": {
    en: "Terms of Service",
    es: "Términos de servicio"
  },
  "Cookie Policy": {
    en: "Cookie Policy",
    es: "Política de cookies"
  },
  "Back to Home": {
    en: "Back to Home",
    es: "Volver al inicio"
  },
  "Our Mission": {
    en: "Our Mission",
    es: "Nuestra misión"
  },
  "We're revolutionizing how communities discover, engage with, and support local businesses through innovative NFC technology and gamified experiences.": {
    en: "We're revolutionizing how communities discover, engage with, and support local businesses through innovative NFC technology and gamified experiences.",
    es: "Estamos revolucionando cómo las comunidades descubren, se involucran y apoyan a los negocios locales a través de tecnología NFC innovadora y experiencias gamificadas."
  },
  "To create an addictive local discovery platform that transforms every business visit into an exciting adventure. We're building the future where customers eagerly explore their neighborhoods, businesses thrive through genuine engagement, and communities grow stronger through meaningful connections.": {
    en: "To create an addictive local discovery platform that transforms every business visit into an exciting adventure. We're building the future where customers eagerly explore their neighborhoods, businesses thrive through genuine engagement, and communities grow stronger through meaningful connections.",
    es: "Crear una plataforma adictiva de descubrimiento local que transforme cada visita comercial en una aventura emocionante. Estamos construyendo el futuro donde los clientes exploran con entusiasmo sus vecindarios, los negocios prosperan a través del compromiso genuino, y las comunidades se fortalecen a través de conexiones significativas."
  },
  "Our Values": {
    en: "Our Values",
    es: "Nuestros valores"
  },
  "These core principles guide everything we do at Cirqlback.": {
    en: "These core principles guide everything we do at Cirqlback.",
    es: "Estos principios fundamentales guían todo lo que hacemos en Cirqlback."
  },
  "Growing Together": {
    en: "Growing Together",
    es: "Creciendo juntos"
  },
  "See how we're making a real impact in communities across the country.": {
    en: "See how we're making a real impact in communities across the country.",
    es: "Mira cómo estamos generando un impacto real en comunidades de todo el país."
  },
  "Advanced Community & Rewards Hub": {
    en: "Advanced Community & Rewards Hub",
    es: "Centro Avanzado de Comunidad y Recompensas"
  },
  "Try Bento Layout": {
    en: "Try Bento Layout",
    es: "Probar diseño Bento"
  },
  "Join team challenges, earn exponential viral rewards, discover AI-powered cross-business partnerships with reward cost-sharing, and unlock personalized experiences across multiple merchant locations!": {
    en: "Join team challenges, earn exponential viral rewards, discover AI-powered cross-business partnerships with reward cost-sharing, and unlock personalized experiences across multiple merchant locations!",
    es: "¡Únete a desafíos de equipo, gana recompensas virales exponenciales, descubre asociaciones comerciales cruzadas impulsadas por IA con costos compartidos de recompensas, y desbloquea experiencias personalizadas en múltiples ubicaciones de comerciantes!"
  },
  "Enter your email to access your rewards dashboard": {
    en: "Enter your email to access your rewards dashboard",
    es: "Ingresa tu correo electrónico para acceder a tu panel de recompensas"
  },
  "Access Dashboard": {
    en: "Access Dashboard", 
    es: "Acceder al panel"
  },
  "AI-Powered Business Intelligence Hub": {
    en: "AI-Powered Business Intelligence Hub",
    es: "Centro de Inteligencia Empresarial Impulsado por IA"
  },
  "Complete business ecosystem with AI partnership recommendations, multi-merchant reward pools, predictive customer analytics, 22+ platform integrations, automated marketing orchestration, and comprehensive export capabilities": {
    en: "Complete business ecosystem with AI partnership recommendations, multi-merchant reward pools, predictive customer analytics, 22+ platform integrations, automated marketing orchestration, and comprehensive export capabilities",
    es: "Ecosistema empresarial completo con recomendaciones de asociaciones de IA, grupos de recompensas multi-comerciante, análisis predictivo de clientes, 22+ integraciones de plataforma, orquestación de marketing automatizada y capacidades de exportación integral"
  }
};

// Quick translate component for static UI text
export function QuickTranslate({ text, className = "" }: { text: string; className?: string }) {
  const { currentLanguage } = useLanguage();
  
  const translated = UI_TRANSLATIONS[text]?.[currentLanguage] || text;
  
  return <span className={className}>{translated}</span>;
}