import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import sw from './locales/sw.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      sw: { translation: sw },
      en: { translation: en },
    },
    fallbackLng: 'sw',
    supportedLngs: ['sw', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Angalia localStorage KWANZA (chaguo la mtumiaji ni la kudumu),
      // kisha lugha ya kivinjari, kisha fallback ya sw.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'tsma_lang',
    },
  })

export default i18n
