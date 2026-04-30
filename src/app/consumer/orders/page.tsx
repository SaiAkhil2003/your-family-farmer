'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

type Order = {
  id: string
  produce_name: string | null
  quantity: number | null
  unit: string | null
  total_price: number | null
  pickup_location: string | null
  status: 'pending' | 'approved' | 'declined'
  payment_method: string | null
  payment_status: string | null
  created_at: string
  farmer?: {
    name: string
    slug: string
    village: string
    upi_id: string | null
  } | null
}

export default function ConsumerOrdersPage() {
  const { tx } = useLang()
  const [phone, setPhone]     = useState('')
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError]     = useState('')

  const digits = phone.replace(/\D/g, '').slice(-10)
  const canSearch = digits.length === 10

  const handleSearch = async () => {
    if (!canSearch) return
    setLoading(true)
    setError('')
    setSearched(false)

    const { data, error: err } = await supabase
      .from('orders')
      .select('id, produce_name, quantity, unit, total_price, pickup_location, status, payment_method, payment_status, created_at, farmer_id')
      .eq('buyer_phone', digits)
      .order('created_at', { ascending: false })
      .limit(50)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Fetch farmer names in one query
    const farmerIds = [...new Set((data ?? []).map((o) => o.farmer_id).filter(Boolean))]
    let farmerMap: Record<string, { name: string; slug: string; village: string; upi_id: string | null }> = {}

    if (farmerIds.length > 0) {
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id, name, slug, village, upi_id')
        .in('id', farmerIds)
      farmerMap = Object.fromEntries(
        (farmers ?? []).map((f) => [f.id, { name: f.name, slug: f.slug, village: f.village, upi_id: (f.upi_id as string | null) ?? null }]),
      )
    }

    const result: Order[] = (data ?? []).map((o) => ({
      ...o,
      farmer: farmerMap[o.farmer_id] ?? null,
    }))

    setOrders(result)
    setSearched(true)
    setLoading(false)
  }

  const statusColor = (s: string) =>
    s === 'approved'
      ? 'bg-green-100 text-green-800'
      : s === 'declined'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-800'

  const statusLabel = (s: string) =>
    s === 'approved' ? '✓ Confirmed' : s === 'declined' ? '✕ Declined' : '⏳ Pending'

  const paymentBadge = (order: Order) => {
    if (!order.payment_method || order.payment_method === 'cod') return null
    if (order.payment_method === 'upi') {
      if (order.payment_status === 'completed') return { label: '✓ UPI Paid', cls: 'bg-green-100 text-green-800' }
      if (order.payment_status === 'payment_claimed') return { label: '⏳ Payment sent — awaiting farmer', cls: 'bg-blue-100 text-blue-800' }
      return { label: '📲 UPI — Pay now', cls: 'bg-orange-100 text-orange-800' }
    }
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-green-900 px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <Link href="/consumer" className="text-green-300 text-sm flex items-center gap-1">
            ← Back / వెనక్కు
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="text-white text-xl font-extrabold leading-tight">{tx.myOrders}</h1>
        <p className="text-green-400 text-sm mt-1">
          Your complete order history / మీ ఆర్డర్ల చరిత్ర
        </p>
      </div>

      <div className="px-4 -mt-5 space-y-4 max-w-lg mx-auto">
        {/* Phone lookup card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm text-gray-600 leading-snug">
            {tx.enterPhoneForOrders}
          </p>
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
              maxLength={10}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <button
            onClick={handleSearch}
            disabled={loading || !canSearch}
            className="w-full bg-green-700 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:bg-green-800"
          >
            {loading ? 'Searching... / వెతుకుతోంది' : tx.lookupOrders}
          </button>
        </div>

        {/* Results */}
        {searched && orders.length === 0 && (
          <div className="text-center py-14">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-gray-500 text-sm">{tx.noOrdersYet}</p>
            <Link href="/consumer" className="mt-4 inline-block text-green-700 text-sm underline font-semibold">
              Browse produce → / పంట చూడండి
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {orders.length} order{orders.length !== 1 ? 's' : ''} found
            </p>
            {orders.map((order) => {
              const badge = paymentBadge(order)
              const needsPayment = order.payment_method === 'upi'
                && order.payment_status === 'pending'
                && order.farmer?.upi_id
              const upiLink = needsPayment
                ? `upi://pay?pa=${encodeURIComponent(order.farmer!.upi_id!)}&pn=${encodeURIComponent(order.farmer!.name)}&am=${order.total_price ?? 0}&cu=INR&tn=YourFamilyFarmer%20Order`
                : null
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 text-sm leading-tight">
                          {order.produce_name || '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.quantity} {order.unit || 'kg'}
                          {order.total_price ? ` · ₹${order.total_price}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                        {badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {order.farmer && (
                      <Link
                        href={`/farmer/${order.farmer.slug}`}
                        className="flex items-center gap-1.5 text-xs text-green-700 font-semibold"
                      >
                        🧑‍🌾 {tx.orderedFrom} {order.farmer.name} · {order.farmer.village} ↗
                      </Link>
                    )}

                    {order.pickup_location && (
                      <p className="text-xs text-gray-500">📍 {tx.pickedUpAt}: {order.pickup_location}</p>
                    )}

                    <p className="text-[11px] text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {/* Pay Now button for pending UPI orders */}
                    {needsPayment && upiLink && (
                      <div className="pt-1 space-y-2">
                        <a
                          href={upiLink}
                          className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm text-center active:bg-blue-700"
                        >
                          📲 Pay ₹{order.total_price} via UPI
                        </a>
                        <p className="text-[11px] text-gray-500 text-center">
                          UPI ID: <span className="font-mono font-semibold">{order.farmer?.upi_id}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
