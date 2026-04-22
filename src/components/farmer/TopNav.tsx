'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

export default function TopNav({ regionSlug }: { regionSlug: string }) {
  const { tx } = useLang()

  const backHref = regionSlug ? `/region/${regionSlug}` : '/consumer'

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link
        href={backHref}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 min-h-[44px]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">{tx.back} / వెనక్కు</span>
      </Link>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <Link
          href="/farmer/dashboard"
          className="flex items-center gap-1 bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl active:bg-green-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 12l9-9 9 9M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home / హోమ్
        </Link>
      </div>
    </nav>
  )
}
