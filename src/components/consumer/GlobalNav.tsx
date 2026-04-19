'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

type ActiveTab = 'consumer' | 'farmer' | 'delivery' | 'moderator'

export default function GlobalNav({ activeTab = 'consumer' }: { activeTab?: ActiveTab }) {
  const { tx } = useLang()

  const tabs = [
    { key: 'consumer' as const, href: '/consumer', label: tx.consumerNav },
    { key: 'farmer' as const, href: '/farmer/dashboard', label: tx.farmerNav },
    { key: 'delivery' as const, href: '#', label: tx.deliveryNav, disabled: true },
    { key: 'moderator' as const, href: '#', label: tx.moderatorNav, disabled: true },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-green-900 shadow-lg">
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-800">
        <Link href="/consumer" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">YFF</span>
          </div>
          <div className="leading-tight">
            <span className="text-white font-bold text-sm block">YourFamilyFarmer</span>
            <span className="text-green-400 text-[11px]">యువర్ ఫ్యామిలీ ఫార్మర్</span>
          </div>
        </Link>
        <LanguageToggle />
      </div>

      {/* Role tabs */}
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab

          if (tab.disabled) {
            return (
              <span key={tab.key} className="flex-1 text-center py-2.5 text-xs text-green-700 font-medium">
                {tab.label}
              </span>
            )
          }

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex-1 text-center py-2.5 text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-green-700 text-white border-b-2 border-green-300'
                  : 'text-green-300 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
