'use client'

import { createContext, useContext, ReactNode } from 'react'
import { t, bilingual, Language, TranslationKey } from './translations'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  tx: typeof t.en
  bi: (key: TranslationKey) => string
}

const biProxy = new Proxy({} as typeof t.en, {
  get: (_, prop: string) => bilingual(prop as TranslationKey),
}) as typeof t.en

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  tx: biProxy,
  bi: (key) => bilingual(key),
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageContext.Provider
      value={{
        lang: 'en',
        setLang: () => {},
        tx: biProxy,
        bi: (key) => bilingual(key),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
