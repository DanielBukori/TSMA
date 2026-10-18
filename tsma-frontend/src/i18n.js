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
    fallbackLng: 'en',
    supportedLngs: ['sw', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // English is the first-visit default; preserve only an explicit saved choice.
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'tsma_lang',
    },
  })

export default i18n
