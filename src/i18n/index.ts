import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en';
import zhTranslations from './locales/zh';

// 检查是否有保存的语言设置
const savedLanguage = localStorage.getItem('userLanguage');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      zh: {
        translation: zhTranslations
      }
    },
    lng: savedLanguage || 'en', // 如果有保存的语言设置则使用，否则默认为英语
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'userLanguage'
    }
  });

export default i18n;