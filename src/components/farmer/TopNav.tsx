'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

export default function TopNav({ regionSlug }: { regionSlug: string }) {
  const { tx } = useLang()

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link
        href={`/region/${regionSlug}`}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm">{tx.back}</span>
      </Link>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z" fill="#2d6a2d" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
          <span className="font-bold text-green-800 text-sm">YFF</span>
        </div>
      </div>
    </nav>
  )
}
