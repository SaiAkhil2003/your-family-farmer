'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import GlobalNav from '@/components/consumer/GlobalNav'
import { CartFab, useCart } from '@/components/consumer/Cart'
import { supabase } from '@/lib/supabase'

type Farmer = {
  id: string
  name: string
  village: string
  slug: string
  phone: string
  method: string
  pickup_locations?: string[] | null
}

type ProduceListing = {
  id: string
  name: string
  variety?: string
  emoji?: string
  image_url?: string
  method?: string
  status: string
  price_tier_1_price?: number
  price_tier_1_qty?: number
  price_tier_2_price?: number
  price_tier_2_qty?: number
  price_tier_3_price?: number
  price_tier_3_qty?: number
  stock_qty?: number
  unit?: string
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [avRes, csRes] = await Promise.all([
        fetch('/api/produce', { cache: 'no-store' }),
        fetch('/api/produce?status=coming_soon', { cache: 'no-store' }),
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
  }, [])

  useEffect(() => {
    fetchData()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    const channel = supabase
      .channel('produce_listings_consumer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produce_listings' }, fetchData)
      .subscribe()
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

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
      const res = await fetch(`/api/produce/search?${p}`, { cache: 'no-store' })
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
      <div className="bg-green-900">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-14">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-snug">
            Fresh from your<br />local farmer
          </h1>
          <p className="text-green-300 text-base sm:text-lg mt-1 font-medium">
            మీ స్థానిక రైతు నుండి తాజా ఆహారం
          </p>
          <p className="text-green-400 text-sm mt-1">
            Straight from farm · No middlemen / నేరుగా పొలం నుండి · మధ్యవర్తులు లేరు
          </p>

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
      </div>

      {/* ── Search card (floats over hero) ────── */}
      <div className="max-w-3xl mx-auto px-4 -mt-7">
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
      <div className="max-w-3xl mx-auto mt-4 px-4">
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
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Available now / ఇప్పుడు అందుబాటులో</h2>
            <p className="text-green-700 font-semibold text-sm leading-tight">
              Fresh produce from farms nearby / తాజా పంట
            </p>
          </div>
          {!loading && (
            <span className="text-sm font-bold text-gray-400">
              {filtered.length} items / వస్తువులు
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
        <div className="max-w-3xl mx-auto px-4 mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-gray-900">Coming soon / త్వరలో వస్తుంది</h2>
            <p className="text-amber-600 font-semibold text-sm">
              Reserve early / ముందుగానే రిజర్వ్
            </p>
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

      {/* ── Floating cart button ─────────────── */}
      <CartFab />
    </main>
  )
}

/* ─── Produce card ──────────────────────────────────────── */
function ProduceCard({ item }: { item: ProduceListing }) {
  const emoji      = item.emoji ?? '🌿'
  const emojiBg    = EMOJI_BG[emoji] ?? 'bg-green-50'
  const method     = item.method?.toLowerCase() ?? 'natural'
  const badge      = METHOD_STYLE[method]  ?? 'bg-green-100 text-green-800'
  const badgeLabel = METHOD_LABEL[method] ?? 'Natural'
  const farmer     = item.farmer
  const farmerHref = farmer ? `/farmer/${farmer.slug}` : '#'
  const unit       = item.unit || 'kg'

  const { cart, addItem, setQty } = useCart()
  const inCart = cart[item.id]

  const canAdd = !!farmer && !!farmer.phone

  const [liveStock, setLiveStock] = useState<number | null>(item.stock_qty ?? null)
  const [stockMsg, setStockMsg]   = useState('')
  const [adding, setAdding]       = useState(false)

  const isOutOfStock = liveStock !== null && liveStock <= 0
  const atMax        = liveStock !== null && inCart != null && inCart.qty >= liveStock

  const handleAdd = async () => {
    if (!farmer) return
    setAdding(true)
    setStockMsg('')

    const { data } = await supabase
      .from('produce_listings')
      .select('stock_qty')
      .eq('id', item.id)
      .single()

    const fresh = data?.stock_qty ?? null
    if (fresh !== null) setLiveStock(fresh)
    setAdding(false)

    if (fresh !== null) {
      if (fresh <= 0) {
        setStockMsg('Out of stock / అయిపోయింది')
        return
      }
      const curQty = inCart?.qty ?? 0
      if (curQty >= fresh) {
        setStockMsg(`Maximum available / గరిష్ట పరిమాణం: ${fresh} ${unit}`)
        return
      }
      if (curQty + 1 > fresh) {
        setStockMsg(`Stock updated / స్టాక్ మారింది, only ${fresh} ${unit} available`)
        return
      }
    }

    addItem({
      listingId: item.id,
      name: item.name,
      variety: item.variety,
      emoji: item.emoji,
      unit,
      stockQty: fresh != null ? fresh : (item.stock_qty ?? undefined),
      pricePerKg: item.price_tier_1_price,
      priceTier1Qty: item.price_tier_1_qty,
      priceTier1Price: item.price_tier_1_price,
      priceTier2Qty: item.price_tier_2_qty,
      priceTier2Price: item.price_tier_2_price,
      priceTier3Price: item.price_tier_3_price,
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerVillage: farmer.village,
      farmerSlug: farmer.slug,
      farmerPickupLocations: farmer.pickup_locations ?? [],
    }, 1)
  }

  const handleInc = () => {
    if (liveStock !== null && inCart.qty >= liveStock) {
      setStockMsg(`Maximum available / గరిష్ట పరిమాణం: ${liveStock} ${unit}`)
      return
    }
    setStockMsg('')
    setQty(item.id, inCart.qty + 1)
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      {/* Image (or emoji fallback) */}
      <Link href={farmerHref}>
        {item.image_url ? (
          <div className="bg-gray-100 aspect-[4/3] overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`${emojiBg} flex items-center justify-center py-7`}>
            <span className="text-5xl">{emoji}</span>
          </div>
        )}
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
            <span className="text-xs font-normal text-gray-400">/{unit}</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
            {badgeLabel}
          </span>
        </div>

        {/* Stock display */}
        {liveStock != null && (
          <p className={`text-xs font-medium ${liveStock === 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {liveStock === 0
              ? 'Out of stock / అయిపోయింది'
              : `${liveStock} ${unit} left / మిగిలాయి`}
          </p>
        )}

        {/* Stock warning */}
        {stockMsg && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 leading-snug text-center">
            {stockMsg}
          </p>
        )}

        {/* CTA */}
        {!canAdd ? (
          <Link
            href={farmerHref}
            className="mt-2 block text-center w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            View / చూడండి
          </Link>
        ) : isOutOfStock ? (
          <button
            disabled
            className="mt-2 w-full bg-gray-200 text-gray-500 font-bold py-3 rounded-xl text-sm cursor-not-allowed"
          >
            Out of stock / అయిపోయింది
          </button>
        ) : !inCart ? (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="mt-2 w-full bg-green-700 active:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
          >
            {adding ? 'Checking... / తనిఖీ' : '+ Add to cart / చేర్చు'}
          </button>
        ) : (
          <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-2 py-1.5">
            <button
              onClick={() => { setQty(item.id, inCart.qty - 1); setStockMsg('') }}
              className="w-8 h-8 rounded-lg bg-white border border-green-300 text-green-800 text-lg font-bold"
              aria-label="Decrease"
            >
              −
            </button>
            <span className="font-extrabold text-green-900 text-sm">
              {inCart.qty} {unit}
            </span>
            <button
              onClick={handleInc}
              disabled={atMax}
              className={`w-8 h-8 rounded-lg text-lg font-bold transition-colors ${
                atMax
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-700 text-white'
              }`}
              aria-label="Increase"
            >
              +
            </button>
          </div>
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
            Ready / సిద్ధం: {new Date(item.available_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
      <p className="text-gray-800 font-bold text-lg">No produce found / పంట కనుగొనబడలేదు</p>
      <p className="text-gray-400 text-sm mt-2">
        Try a different search or category<br />
        వేరే వెతకండి లేదా వేరే వర్గాన్ని ఎంచుకోండి
      </p>
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
      setError('Please fill crop name, your name, and phone number. / పంట పేరు, మీ పేరు, ఫోన్ నంబర్ నింపండి.')
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
    <div className="max-w-3xl mx-auto px-4 mt-10 mb-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📣</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-amber-900 text-base leading-tight">
              Raise a Demand Intent / డిమాండ్ నమోదు
            </h3>
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
            <p className="text-green-700 font-bold text-base">✓ Intent raised! / నమోదైంది!</p>
            <p className="text-green-600 text-sm mt-1">
              Farmers in your area will be notified.<br />
              మీ ప్రాంతంలోని రైతులకు తెలియజేస్తాము.
            </p>
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
                placeholder="Quantity (kg) / పరిమాణం"
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
              placeholder="Delivery location / డెలివరీ స్థలం"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Your name * / మీ పేరు"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Your WhatsApp number * / మీ వాట్సాప్ నంబర్"
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
                Cancel / రద్దు
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-amber-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {loading ? 'Submitting... / నమోదు అవుతోంది' : 'Submit / నమోదు'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

