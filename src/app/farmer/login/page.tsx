'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

    // Try all common phone formats stored in DB
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

    const farmer = farmers?.[0]
    setLoading(false)

    if (!farmer) {
      setError('Phone number not found. Contact the YFF team to register as a farmer.')
      return
    }

    localStorage.setItem('yff_farmer_id', farmer.id)
    localStorage.setItem('yff_farmer_slug', farmer.slug)
    router.replace('/farmer/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/consumer" className="inline-flex flex-col items-center">
            <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mb-3">
              <span className="text-white font-black text-lg">YFF</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Farmer Login</h1>
          <p className="text-gray-500 text-sm mt-1">రైతు లాగిన్</p>
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
            {loading ? 'Checking...' : 'Login / లాగిన్ అవ్వండి'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Only registered farmers can log in.{' '}
          <Link href="/consumer" className="text-green-700 underline">Browse produce</Link>
        </p>
      </div>
    </main>
  )
}
