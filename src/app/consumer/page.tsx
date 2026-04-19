'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import GlobalNav from '@/components/consumer/GlobalNav'

type Farmer = {
  id: string
  name: string
  village: string
  slug: string
  phone: string
  method: string
}

type ProduceListing = {
  id: string
  name: string
  variety?: string
  emoji?: string
  method?: string
  status: string
  price_tier_1_price?: number
  price_tier_1_qty?: number
  price_tier_2_price?: number
  price_tier_2_qty?: number
  price_tier_3_price?: number
  price_tier_3_qty?: number
  stock_qty?: number
  available_to?: string
  farmer_id: string
  farmer?: Farmer
}

const CATEGORIES = [
  { key: 'all',        en: 'All',             te: 'అన్నీ' },
  { key: 'vegetables', en: 'Vegetables',      te: 'కూరగాయలు' },
  { key: 'fruits',     en: 'Fruits',          te: 'పళ్ళు' },
  { key: 'grains',     en: 'Grains & Pulses', te: 'ధాన్యాలు' },
  { key: 'leafy',      en: 'Leafy Greens',    te: 'ఆకు కూరలు' },
]

const EMOJI_BG: Record<string, string> = {
  '🍅': 'bg-red-100',    '🥬': 'bg-green-100',  '🥭': 'bg-orange-100',
  '🍆': 'bg-purple-100', '🥕': 'bg-orange-100', '🌽': 'bg-yellow-100',
  '🍌': 'bg-yellow-100', '🫑': 'bg-green-100',  '🧅': 'bg-orange-50',
  '🧄': 'bg-amber-50',   '🍓': 'bg-red-50',     '🥦': 'bg-green-100',
  '🌾': 'bg-amber-100',  '🫒': 'bg-green-100',  '🌿': 'bg-green-50',
  '🥥': 'bg-orange-50',  '🍇': 'bg-purple-50',  '🍋': 'bg-yellow-50',
}

const METHOD_STYLE: Record<string, string> = {
  natural:      'bg-green-100 text-green-800',
  organic:      'bg-teal-100  text-teal-800',
  low_chemical: 'bg-amber-100 text-amber-800',
  chemical:     'bg-red-100   text-red-700',
}

const METHOD_LABEL: Record<string, string> = {
  natural:      'Natural / సహజం',
  organic:      'Organic / సేంద్రీయ',
  low_chemical: 'Low chemical',
  chemical:     'Chemical',
}

export default function ConsumerPage() {
  const [available, setAvailable]     = useState<ProduceListing[]>([])
  const [comingSoon, setComingSoon]   = useState<ProduceListing[]>([])
  const [filtered, setFiltered]       = useState<ProduceListing[]>([])
  const [search, setSearch]           = useState('')
  const [method, setMethod]           = useState('all')
  const [category, setCategory]       = useState('all')
  const [loading, setLoading]         = useState(true)
  const [farmerCount, setFarmerCount] = useState(0)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [avRes, csRes] = await Promise.all([
        fetch('/api/produce'),
        fetch('/api/produce?status=coming_soon'),
      ])
      const av: ProduceListing[] = await avRes.json().catch(() => [])
      const cs: ProduceListing[] = await csRes.json().catch(() => [])
      const avArr = Array.isArray(av) ? av : []
      const csArr = Array.isArray(cs) ? cs : []
      setAvailable(avArr)
      setFiltered(avArr)
      setComingSoon(csArr)
      setFarmerCount(new Set(avArr.map((p) => p.farmer_id)).size)
    } catch { /* silent */ }
    setLoading(false)
  }

  const doSearch = useCallback(async () => {
    if (!search && method === 'all' && category === 'all') {
      setFiltered(available)
      return
    }
    try {
      const p = new URLSearchParams()
      if (search)              p.set('q', search)
      if (method !== 'all')    p.set('method', method)
      if (category !== 'all')  p.set('category', category)
      const res = await fetch(`/api/produce/search?${p}`)
      const data = await res.json().catch(() => [])
      setFiltered(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
  }, [search, method, category, available])

  useEffect(() => {
    const t = setTimeout(doSearch, 300)
    return () => clearTimeout(t)
  }, [doSearch])

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <GlobalNav activeTab="consumer" />

      {/* ── Hero ─────────────────────────────── */}
      <div className="bg-green-900 px-4 pt-8 pb-14">
        <h1 className="text-2xl font-extrabold text-white leading-snug">
          Fresh from your<br />neighbourhood farmer
        </h1>
        <p className="text-green-300 text-base mt-1 font-medium">
          మీ పక్కింటి రైతు నుండి తాజా ఆహారం
        </p>
        <p className="text-green-400 text-sm mt-1">నేరుగా పొలం నుండి · మధ్యవర్తులు లేరు</p>

        {/* Stats */}
        <div className="flex gap-8 mt-6">
          {[
            { val: farmerCount,       en: 'Farmers',    te: 'రైతులు' },
            { val: available.length,  en: 'Products',   te: 'పంటలు' },
            { val: 0,                 en: 'Middlemen',  te: 'మధ్యవర్తులు' },
          ].map((s) => (
            <div key={s.en}>
              <div className="text-4xl font-black text-white">{s.val}</div>
              <div className="text-xs text-green-300 mt-0.5 leading-snug">
                {s.en}<br />{s.te}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search card (floats over hero) ────── */}
      <div className="px-4 -mt-7">
        <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              placeholder="Search produce... / పంట వెతకండి..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-green-500 focus:outline-none"
            />
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">🌿 All methods / అన్ని పద్ధతులు</option>
            <option value="natural">🌱 Natural / సహజం</option>
            <option value="organic">🍃 Organic / సేంద్రీయ</option>
            <option value="low_chemical">⚡ Low chemical / తక్కువ రసాయన</option>
          </select>
        </div>
      </div>

      {/* ── Category chips ───────────────────── */}
      <div className="mt-4 px-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setCategory(chip.key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                category === chip.key
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {chip.en} / {chip.te}
            </button>
          ))}
        </div>
      </div>

      {/* ── Available now ────────────────────── */}
      <div className="px-4 mt-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Available now</h2>
            <p className="text-green-700 font-semibold text-sm leading-tight">ఇప్పుడు అందుబాటులో</p>
          </div>
          {!loading && (
            <span className="text-sm font-bold text-gray-400">
              {filtered.length} items
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <ProduceCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* ── Coming soon ──────────────────────── */}
      {!loading && comingSoon.length > 0 && (
        <div className="px-4 mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-gray-900">Coming soon</h2>
            <p className="text-amber-600 font-semibold text-sm">త్వరలో వస్తుంది</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {comingSoon.map((item) => (
              <ComingSoonCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Demand intent banner ─────────────── */}
      <DemandIntentBanner />
    </main>
  )
}

/* ─── Produce card ──────────────────────────────────────── */
function ProduceCard({ item }: { item: ProduceListing }) {
  const emoji    = item.emoji ?? '🌿'
  const emojiBg  = EMOJI_BG[emoji] ?? 'bg-green-50'
  const method   = item.method?.toLowerCase() ?? 'natural'
  const badge    = METHOD_STYLE[method]  ?? 'bg-green-100 text-green-800'
  const badgeLabel = METHOD_LABEL[method] ?? 'Natural'
  const farmer   = item.farmer

  const orderMsg = farmer
    ? `Hello ${farmer.name} anna! I found your profile on YourFamilyFarmer.\nI would like to order:\n- ${item.name}${item.variety ? ` (${item.variety})` : ''}: ___ kg\n\nMy name: \nDelivery or pickup: \nMy location / address: `
    : ''
  const waLink = farmer?.phone
    ? `https://wa.me/${farmer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(orderMsg)}`
    : null
  const farmerHref = farmer ? `/farmer/${farmer.slug}` : '#'

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      {/* Emoji header — taps go to farmer profile */}
      <Link href={farmerHref}>
        <div className={`${emojiBg} flex items-center justify-center py-7`}>
          <span className="text-5xl">{emoji}</span>
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-1 gap-1">
        {/* Name + variety */}
        <Link href={farmerHref}>
          <h3 className="font-extrabold text-gray-900 text-base leading-tight">{item.name}</h3>
          {item.variety && (
            <p className="text-xs text-gray-400 mt-0.5">{item.variety}</p>
          )}
        </Link>

        {/* Farmer info */}
        {farmer && (
          <Link href={farmerHref} className="text-xs text-gray-500 leading-snug">
            🧑‍🌾 {farmer.name}<br />
            📍 {farmer.village}
          </Link>
        )}

        {/* Price + method badge */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-green-700 font-black text-lg">
            {item.price_tier_1_price ? `₹${item.price_tier_1_price}` : '—'}
            <span className="text-xs font-normal text-gray-400">/kg</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
            {badgeLabel}
          </span>
        </div>

        {/* Stock */}
        {item.stock_qty != null && (
          <p className="text-xs text-gray-400">
            {item.stock_qty} kg left / మిగిలాయి
          </p>
        )}

        {/* CTA button */}
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            <WhatsAppIcon />
            Order / ఆర్డర్
          </a>
        ) : (
          <Link
            href={farmerHref}
            className="mt-2 block text-center w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            View / చూడండి
          </Link>
        )}
      </div>
    </div>
  )
}

/* ─── Coming soon card ──────────────────────────────────── */
function ComingSoonCard({ item }: { item: ProduceListing }) {
  const emoji   = item.emoji ?? '🌱'
  const emojiBg = EMOJI_BG[emoji] ?? 'bg-amber-50'
  const farmer  = item.farmer

  return (
    <div className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-amber-200 flex flex-col">
      <div className={`${emojiBg} flex items-center justify-center py-7`}>
        <span className="text-5xl">{emoji}</span>
      </div>
      <div className="p-3 flex flex-col flex-1 gap-1">
        <h3 className="font-extrabold text-gray-700 text-base leading-tight">{item.name}</h3>
        {farmer && (
          <p className="text-xs text-gray-400">🧑‍🌾 {farmer.name}</p>
        )}
        {item.available_to && (
          <p className="text-xs text-amber-600 font-medium">
            Ready: {new Date(item.available_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}
        <span className="mt-1 inline-block bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full self-start">
          Coming soon / త్వరలో
        </span>
        {farmer && (
          <Link
            href={`/farmer/${farmer.slug}`}
            className="mt-2 block text-center w-full border-2 border-green-600 text-green-700 font-bold py-3 rounded-xl text-sm"
          >
            View farmer / రైతు చూడండి
          </Link>
        )}
      </div>
    </div>
  )
}

/* ─── Loading skeleton ──────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
          <div className="h-28 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-11 bg-gray-100 rounded-xl mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="text-center py-14">
      <div className="text-6xl mb-4">🔍</div>
      <p className="text-gray-800 font-bold text-lg">No produce found</p>
      <p className="text-gray-500 text-base mt-1">పంట కనుగొనబడలేదు</p>
      <p className="text-gray-400 text-sm mt-2">Try a different search or category</p>
    </div>
  )
}

/* ─── Demand intent banner ──────────────────────────────────── */
function DemandIntentBanner() {
  const [open, setOpen] = useState(false)
  const [crop, setCrop] = useState('')
  const [qty, setQty] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!crop.trim() || !name.trim() || !phone.trim()) {
      setError('Please fill crop name, your name, and phone number.')
      return
    }
    setLoading(true)
    setError('')
    const { supabase: sb } = await import('@/lib/supabase')
    const { error: err } = await sb.from('demand_intents').insert({
      crop_name: crop.trim(),
      quantity_kg: qty ? Number(qty) : null,
      needed_by_date: date || null,
      delivery_location: location.trim() || null,
      requester_name: name.trim(),
      requester_phone: phone.trim(),
      region_slug: 'tadepalligudem',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSubmitted(true)
  }

  return (
    <div className="px-4 mt-10 mb-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📣</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-amber-900 text-base leading-tight">Raise a Demand Intent</h3>
            <p className="text-amber-700 text-sm mt-1 leading-snug">
              Let local farmers know what you need — they&apos;ll reach out when available.
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              స్థానిక రైతులకు మీకు ఏమి కావాలో తెలియజేయండి
            </p>
          </div>
        </div>

        {!open && !submitted && (
          <button
            onClick={() => setOpen(true)}
            className="mt-4 w-full bg-amber-600 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Raise Intent / డిమాండ్ నమోదు
          </button>
        )}

        {submitted && (
          <div className="mt-4 text-center py-3">
            <p className="text-green-700 font-bold text-base">✓ Intent raised!</p>
            <p className="text-green-600 text-sm mt-1">Farmers in your area will be notified.</p>
          </div>
        )}

        {open && !submitted && (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Crop name * (e.g. Tomato / టమాటా)"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Quantity (kg)"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="border border-amber-200 rounded-xl px-3 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-amber-200 rounded-xl px-3 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Delivery location (e.g. Tadepalligudem)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Your name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Your WhatsApp number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setError('') }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-semibold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-amber-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit / నమోదు'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── WhatsApp icon ─────────────────────────────────────── */
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
