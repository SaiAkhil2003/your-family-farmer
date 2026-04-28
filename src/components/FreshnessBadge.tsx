'use client'

import { useLang } from '@/lib/LanguageContext'

export function FreshnessBadge({ harvestDate }: { harvestDate: string }) {
  const { tx } = useLang()

  // Parse as local midnight so timezone doesn't flip the day
  const harvest = new Date(harvestDate + 'T00:00:00')
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.floor((todayMidnight.getTime() - harvest.getTime()) / 86400000)

  if (days < 0) return null
  if (days === 0)
    return (
      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        {tx.harvestToday}
      </span>
    )
  if (days === 1)
    return (
      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        {tx.harvestYesterday}
      </span>
    )
  return (
    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
      {tx.harvestDaysAgo.replace('{n}', String(days))}
    </span>
  )
}
