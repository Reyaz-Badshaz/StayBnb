import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  // Load translations from /public/locales
  .use(HttpBackend)
  // Detect user language
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize
  .init({
    // Supported languages
    supportedLngs: ['en', 'es', 'fr'],
    
    // Fallback language
    fallbackLng: 'en',
    
    // Debug mode in development
    debug: import.meta.env.DEV,
    
    // Namespace configuration
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Detection configuration
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache user language
      caches: ['localStorage'],
      
      // LocalStorage key
      lookupLocalStorage: 'staybnb-language',
    },
    
    // React configuration
    react: {
      useSuspense: true,
    },
    
    // Interpolation configuration
    interpolation: {
      // React already escapes values
      escapeValue: false,
      
      // Format functions
      format: (value, format) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'currency') {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(value);
        }
        if (format === 'number') {
          return new Intl.NumberFormat(i18n.language).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(i18n.language).format(new Date(value));
        }
        return value;
      },
    },
  });

export default i18n;

// Language display names
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

// Helper to change language
export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
};

// Helper to get current language
export const getCurrentLanguage = () => {
  return i18n.language;
};
