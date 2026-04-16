'use client'

import { useLang } from '@/lib/LanguageContext'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-bold">
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-full transition-all ${
          lang === 'en' ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('te')}
        className={`px-2.5 py-1 rounded-full transition-all ${
          lang === 'te' ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'
        }`}
      >
        తె
      </button>
    </div>
  )
}
