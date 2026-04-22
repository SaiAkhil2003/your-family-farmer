'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

type Region = {
  name: string
  district: string
}

export default function RegionTopBar({ region }: { region: Record<string, unknown> }) {
  const r = region as Region
  const { tx } = useLang()

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z" fill="#2d6a2d" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
        <span className="font-bold text-green-800 text-sm">{tx.appName}</span>
        <span className="ml-2 flex items-center gap-1 text-xs text-gray-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {r.name}
        </span>
      </div>

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
    </div>
  )
}
