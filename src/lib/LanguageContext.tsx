'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { t, Language } from './translations'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  tx: typeof t.en
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  tx: t.en,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('yff_lang') as Language
    if (saved === 'en' || saved === 'te') setLangState(saved)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('yff_lang', newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, tx: t[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
