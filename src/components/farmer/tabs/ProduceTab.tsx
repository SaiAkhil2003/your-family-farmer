'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LanguageContext'

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
  id?: string
  name?: string
  phone?: string
}

const EMOJI_OPTIONS = ['🍅', '🍌', '🥭', '🫑', '🥬', '🍆', '🥕', '🌽', '🧅', '🧄', '🥦', '🌿', '🍓', '🫒', '🌾']
const STATUS_OPTIONS = ['available', 'coming_soon']

export default function ProduceTab({
  farmer,
  produce,
  isEditMode = false,
}: {
  farmer: Record<string, unknown>
  produce: Record<string, unknown>[]
  isEditMode?: boolean
}) {
  const { tx } = useLang()
  const f = farmer as Farmer
  const [listings, setListings] = useState<Produce[]>(produce as Produce[])
  const available = listings.filter((p) => p.status === 'available')
  const comingSoon = listings.filter((p) => p.status === 'coming_soon')

  const buildWhatsAppLink = (item: Produce) => {
    const message = tx.orderMessage
      .replace('{name}', f.name ?? '')
      .replace('{produce}', `${item.name}${item.variety ? ` (${item.variety})` : ''}`)
    return `https://wa.me/${f.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  }

  const handleProduceAdded = (newItem: Produce) => {
    setListings((prev) => [newItem, ...prev])
  }

  return (
    <div className="space-y-6">
      {available.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">
              {tx.availableNow}
            </span>
          </div>
          <div className="space-y-3">
            {available.map((item) => (
              <ProduceCard key={item.id} item={item} whatsappLink={buildWhatsAppLink(item)} />
            ))}
          </div>
        </div>
      )}

      {comingSoon.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
              {tx.comingSoon}
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
        <div className="text-center py-6 text-gray-400 text-sm">{tx.noProduceListed}</div>
      )}

      {isEditMode && f.id && (
        <AddProduceForm farmerId={f.id} onAdded={handleProduceAdded} />
      )}
    </div>
  )
}

function AddProduceForm({ farmerId, onAdded }: { farmerId: string; onAdded: (item: Produce) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [emoji, setEmoji] = useState('🌿')
  const [status, setStatus] = useState<'available' | 'coming_soon'>('available')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName(''); setVariety(''); setEmoji('🌿'); setStatus('available')
    setPrice(''); setStock(''); setSuccess(false); setError('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const payload: Record<string, unknown> = {
      farmer_id: farmerId,
      name: name.trim(),
      emoji,
      status,
      method: 'Natural',
    }
    if (variety.trim()) payload.variety = variety.trim()
    if (price) payload.price_tier_1_price = Number(price)
    if (stock) payload.stock_qty = Number(stock)

    const { data, error: insertError } = await supabase.from('produce_listings').insert(payload).select().single()
    setLoading(false)
    if (!insertError && data) {
      onAdded(data as Produce)
      setSuccess(true)
      setTimeout(() => { reset(); setOpen(false) }, 1500)
    } else {
      setError(insertError?.message ?? 'Failed to add produce. Check Supabase RLS policies.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-green-300 rounded-xl py-4 text-green-700 text-sm font-semibold flex items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 transition-colors"
      >
        <span className="text-lg">+</span> Add your produce
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">Add produce</h3>
        <button onClick={() => { reset(); setOpen(false) }} className="text-gray-400 text-lg leading-none">×</button>
      </div>

      {/* Emoji picker */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Pick an icon</p>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-50'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name + variety */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Produce name (e.g. Papaya)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Variety (optional, e.g. Red Lady)"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Price + stock */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Price / kg (₹)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Stock (kg)"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Status */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s as 'available' | 'coming_soon')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              status === s
                ? s === 'available' ? 'bg-green-700 text-white' : 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s === 'available' ? 'Available now' : 'Coming soon'}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-center text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {success ? (
        <p className="text-center text-sm text-green-700 font-semibold py-1">✓ Added successfully!</p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add produce'}
        </button>
      )}
    </div>
  )
}

function ProduceCard({ item, whatsappLink }: { item: Produce; whatsappLink: string }) {
  const { tx } = useLang()
  const bgColors: Record<string, string> = {
    '🍅': 'bg-red-100', '🥬': 'bg-green-100', '🥭': 'bg-orange-100',
    '🍆': 'bg-purple-100', '🥕': 'bg-orange-100', '🌽': 'bg-yellow-100',
    '🍌': 'bg-yellow-100', '🫑': 'bg-green-100',
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
              <span className="text-xs text-gray-500 flex-shrink-0">{item.stock_qty} {tx.stockLeft}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.method && (
              <span className="bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">{item.method}</span>
            )}
            {item.pesticide_result && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">{item.pesticide_result}</span>
            )}
            {item.brix && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">BRIX {item.brix}</span>
            )}
          </div>
        </div>
      </div>

      {item.price_tier_1_price && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
            {item.price_tier_1_price && (
              <span>{item.price_tier_1_qty ? `1–${item.price_tier_2_qty ? item.price_tier_2_qty - 1 : item.price_tier_1_qty} kg` : 'Per kg'}: <strong>₹{item.price_tier_1_price}</strong></span>
            )}
            {item.price_tier_2_qty && item.price_tier_2_price && (
              <span>{item.price_tier_2_qty}–{item.price_tier_3_qty ? item.price_tier_3_qty - 1 : '+'} kg: <strong>₹{item.price_tier_2_price}</strong></span>
            )}
            {item.price_tier_3_qty && item.price_tier_3_price && (
              <span>{item.price_tier_3_qty}+ kg: <strong>₹{item.price_tier_3_price}</strong></span>
            )}
          </div>
        </div>
      )}

      <div className="px-3 pb-3 pt-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full text-center bg-green-700 text-white font-bold py-3.5 rounded-xl text-base"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {tx.orderWhatsApp}
        </a>
      </div>
    </div>
  )
}

function ComingSoonCard({ item, farmerId }: { item: Produce; farmerId: string }) {
  const { tx } = useLang()
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
              {tx.expected} {new Date(item.available_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
          {tx.comingSoon}
        </span>
      </div>

      {submitted ? (
        <p className="text-sm text-green-700 font-semibold text-center py-2">{tx.notifySuccess}</p>
      ) : (
        <div className="space-y-2 mt-3">
          <input type="text" placeholder={tx.yourName} value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="tel" placeholder={tx.yourPhone} value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={handleNotify} disabled={loading}
            className="w-full bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
            {loading ? tx.saving : tx.notifyMe}
          </button>
        </div>
      )}
    </div>
  )
}
