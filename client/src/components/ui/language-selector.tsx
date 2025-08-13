
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Languages, Globe } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/translation';

interface LanguageSelectorProps {
  variant?: 'select' | 'button';
  size?: 'sm' | 'md' | 'lg';
  showFlag?: boolean;
  className?: string;
}

export function LanguageSelector({ 
  variant = 'select', 
  size = 'md',
  showFlag = true,
  className = '' 
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage();

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          // Cycle through languages or open a modal
          const languages = Object.keys(supportedLanguages) as SupportedLanguage[];
          const currentIndex = languages.indexOf(currentLanguage);
          const nextIndex = (currentIndex + 1) % languages.length;
          setLanguage(languages[nextIndex]);
        }}
      >
        <Globe className="h-4 w-4" />
        {showFlag && supportedLanguages[currentLanguage].flag}
        <span className="hidden sm:inline">
          {supportedLanguages[currentLanguage].name}
        </span>
      </Button>
    );
  }

  return (
    <Select value={currentLanguage} onValueChange={(value: SupportedLanguage) => setLanguage(value)}>
      <SelectTrigger className={`w-auto min-w-32 ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {showFlag && supportedLanguages[currentLanguage].flag}
            <span>{supportedLanguages[currentLanguage].name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(supportedLanguages).map(([code, lang]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              {showFlag && <span>{lang.flag}</span>}
              <span>{lang.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Quick language switcher for mobile
export function MobileLanguageSwitcher() {
  const { currentLanguage, supportedLanguages } = useLanguage();
  
  return (
    <div className="flex items-center gap-1 text-sm">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {supportedLanguages[currentLanguage].flag} {supportedLanguages[currentLanguage].code.toUpperCase()}
      </span>
    </div>
  );
}