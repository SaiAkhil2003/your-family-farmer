'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import LanguageToggle from '@/components/LanguageToggle'

export default function FarmerLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length < 10) return
    setLoading(true)
    setError('')

    // 1. Try all common phone formats stored in DB
    const { data: farmers } = await supabase
      .from('farmers')
      .select('id, name, slug, phone')
      .or([
        `phone.eq.${digits}`,
        `phone.eq.0${digits}`,
        `phone.eq.+91${digits}`,
        `phone.eq.91${digits}`,
      ].join(','))
      .limit(1)

    let farmer = farmers?.[0]

    // Ensure returning farmers have active=true (may be null for older/seeded records)
    if (farmer) {
      await supabase.from('farmers').update({ active: true }).eq('id', farmer.id)
    }

    // 2. If not found, auto-create a minimal farmer record.
    if (!farmer) {
      const rand = Math.random().toString(36).slice(2, 6)
      const slug = `f-${digits}-${rand}`

      const { data: created, error: insertErr } = await supabase
        .from('farmers')
        .insert({
          phone: digits,
          slug,
          name: '',
          village: '',
          district: '',
          method: 'natural',
          region_slug: 'tadepalligudem',
          active: true,
        })
        .select('id, name, slug, phone')
        .single()

      if (insertErr || !created) {
        setLoading(false)
        setError(
          insertErr?.message ??
            'Could not create your farmer profile. Please try again.',
        )
        return
      }
      farmer = created
    }

    setLoading(false)
    localStorage.setItem('yff_farmer_id', farmer.id)
    localStorage.setItem('yff_farmer_slug', farmer.slug)
    router.replace('/farmer/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/consumer" className="inline-flex flex-col items-center">
            <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mb-3">
              <span className="text-white font-black text-lg">YFF</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Farmer Login / రైతు లాగిన్</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in with WhatsApp / వాట్సాప్ తో సైన్ ఇన్</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              WhatsApp Number / వాట్సాప్ నంబర్
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium whitespace-nowrap">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
                maxLength={10}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || phone.replace(/\D/g, '').length < 10}
            className="w-full bg-green-700 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:bg-green-800 transition-colors"
          >
            {loading ? 'Please wait... / దయచేసి వేచి ఉండండి' : 'Continue / కొనసాగండి'}
          </button>

          <p className="text-xs text-gray-500 text-center leading-snug">
            New here? Just enter your number and continue — we&apos;ll set up your profile.<br />
            కొత్తవారా? మీ నంబర్ నమోదు చేసి కొనసాగండి.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/consumer" className="text-green-700 underline">
            Browse produce instead / పంట బ్రౌజ్ చేయండి
          </Link>
        </p>
      </div>
    </main>
  )
}
