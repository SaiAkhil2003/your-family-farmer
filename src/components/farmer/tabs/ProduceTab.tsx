'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Produce = {
  id: string
  name: string
  variety?: string
  emoji?: string
  method?: string
  status: string
  price_tier_1_qty?: number
  price_tier_1_price?: number
  price_tier_2_qty?: number
  price_tier_2_price?: number
  price_tier_3_qty?: number
  price_tier_3_price?: number
  stock_qty?: number
  brix?: number
  pesticide_result?: string
  shelf_life_days?: number
  available_to?: string
}

type Farmer = {
  name?: string
  phone?: string
}

export default function ProduceTab({
  farmer,
  produce,
}: {
  farmer: Record<string, unknown>
  produce: Record<string, unknown>[]
}) {
  const f = farmer as Farmer
  const listings = produce as Produce[]
  const available = listings.filter((p) => p.status === 'available')
  const comingSoon = listings.filter((p) => p.status === 'coming_soon')

  const buildWhatsAppLink = (item: Produce) => {
    const message = `Hello ${f.name} anna! I found your profile on YourFamilyFarmer.\nI would like to order:\n- ${item.name}${item.variety ? ` (${item.variety})` : ''}\n\nMy name: \nDelivery / pickup preference: \nMy location: `
    return `https://wa.me/${f.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="space-y-6">
      {/* Available now */}
      {available.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">
              Available now
            </span>
          </div>
          <div className="space-y-3">
            {available.map((item) => (
              <ProduceCard
                key={item.id}
                item={item}
                whatsappLink={buildWhatsAppLink(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coming soon */}
      {comingSoon.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
              Coming soon
            </span>
          </div>
          <div className="space-y-3">
            {comingSoon.map((item) => (
              <ComingSoonCard key={item.id} item={item} farmerId={item.id} />
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No produce listed yet. Check back soon.
        </div>
      )}
    </div>
  )
}

function ProduceCard({ item, whatsappLink }: { item: Produce; whatsappLink: string }) {
  const bgColors: Record<string, string> = {
    '🍅': 'bg-red-100',
    '🥬': 'bg-green-100',
    '🥭': 'bg-orange-100',
    '🍆': 'bg-purple-100',
    '🥕': 'bg-orange-100',
    '🌽': 'bg-yellow-100',
  }
  const emoji = item.emoji ?? '🌿'
  const bg = bgColors[emoji] ?? 'bg-green-100'

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="flex gap-3 p-3">
        <div className={`${bg} rounded-xl w-14 h-14 flex items-center justify-center text-3xl flex-shrink-0`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
              {item.variety && <p className="text-xs text-gray-500">{item.variety}</p>}
            </div>
            {item.stock_qty !== undefined && (
              <span className="text-xs text-gray-500 flex-shrink-0">{item.stock_qty} kg left</span>
            )}
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.method && (
              <span className="bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {item.method}
              </span>
            )}
            {item.pesticide_result && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {item.pesticide_result}
              </span>
            )}
            {item.brix && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                BRIX {item.brix}
              </span>
            )}
            {item.shelf_life_days && (
              <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {item.shelf_life_days} days shelf life
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tiered pricing */}
      {item.price_tier_1_price && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
            {item.price_tier_1_qty && item.price_tier_1_price && (
              <span>
                1–{item.price_tier_2_qty ? item.price_tier_2_qty - 1 : item.price_tier_1_qty} kg:{' '}
                <strong>₹{item.price_tier_1_price}</strong>
              </span>
            )}
            {item.price_tier_2_qty && item.price_tier_2_price && (
              <span>
                {item.price_tier_2_qty}–{item.price_tier_3_qty ? item.price_tier_3_qty - 1 : '+'} kg:{' '}
                <strong>₹{item.price_tier_2_price}</strong>
              </span>
            )}
            {item.price_tier_3_qty && item.price_tier_3_price && (
              <span>
                {item.price_tier_3_qty}+ kg: <strong>₹{item.price_tier_3_price}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Order button */}
      <div className="px-3 pb-3 pt-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg"
        >
          Order via WhatsApp
        </a>
      </div>
    </div>
  )
}

function ComingSoonCard({ item, farmerId }: { item: Produce; farmerId: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleNotify = async () => {
    if (!name || !phone) return
    setLoading(true)
    await supabase.from('notify_requests').insert({
      farmer_id: farmerId,
      produce_name: item.name,
      requester_name: name,
      requester_phone: phone,
    })
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-700 text-sm">{item.emoji ?? '🌱'} {item.name}</h3>
          {item.available_to && (
            <p className="text-xs text-gray-500 mt-0.5">
              Expected: {new Date(item.available_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
          Coming soon
        </span>
      </div>

      {submitted ? (
        <p className="text-sm text-green-700 font-semibold text-center py-2">
          ✓ We will notify you when it is ready!
        </p>
      ) : (
        <div className="space-y-2 mt-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Your WhatsApp number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleNotify}
            disabled={loading}
            className="w-full bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Notify me when ready'}
          </button>
        </div>
      )}
    </div>
  )
}
