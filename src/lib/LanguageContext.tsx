'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { t, Language, TranslationKey } from './translations'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  tx: typeof t.en
  bi: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  tx: t.en,
  bi: (key) => t.en[key] ?? '',
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('yff_lang') : null
    if (saved === 'en' || saved === 'te') setLangState(saved)
  }, [])

  const setLang = (next: Language) => {
    setLangState(next)
    if (typeof window !== 'undefined') localStorage.setItem('yff_lang', next)
  }

  const tx = t[lang]
  const bi = (key: TranslationKey) => (t[lang] as Record<string, string>)[key] ?? t.en[key] ?? ''

  return (
    <LanguageContext.Provider value={{ lang, setLang, tx, bi }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
