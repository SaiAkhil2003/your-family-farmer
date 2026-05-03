'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import GlobalNav from '@/components/consumer/GlobalNav'
import { CartFab, useCart } from '@/components/consumer/Cart'
import { supabase } from '@/lib/supabase'
import { FreshnessBadge } from '@/components/FreshnessBadge'
import { haversineKm, nearestTown, formatDistance } from '@/lib/location'
import LocationSearch from '@/components/LocationSearch'
import {
  buildUpiPaymentUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  resolveUpiPayeeName,
} from '@/lib/upi'

type PickupSlots = {
  days: string[]
  time_from: string
  time_to: string
}

type Farmer = {
  id: string
  name: string
  village: string
  slug: string
  phone: string
  method: string
  pickup_locations?: string[] | null
  pickup_slots?: PickupSlots | null
  lat?: number | null
  lng?: number | null
  upi_id?: string | null
  upi_name?: string | null
  upi_qr_code_url?: string | null
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
  harvest_date?: string | null
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
  const searchAbortRef = useRef<AbortController | null>(null)

  // Consumer location
  const [consumerLat, setConsumerLat]           = useState<number | null>(null)
  const [consumerLng, setConsumerLng]           = useState<number | null>(null)
  const [consumerLocationName, setConsumerLocationName] = useState('')
  const [showLocationSheet, setShowLocationSheet]       = useState(false)
  const [distanceFilter, setDistanceFilter]             = useState<number | null>(null)

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
    searchAbortRef.current?.abort()
    searchAbortRef.current = new AbortController()
    try {
      const p = new URLSearchParams()
      if (search)              p.set('q', search)
      if (method !== 'all')    p.set('method', method)
      if (category !== 'all')  p.set('category', category)
      const res = await fetch(`/api/produce/search?${p}`, { cache: 'no-store', signal: searchAbortRef.current.signal })
      const data = await res.json().catch(() => [])
      setFiltered(Array.isArray(data) ? data : [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { /* silent */ }
    }
  }, [search, method, category, available])

  useEffect(() => {
    const t = setTimeout(doSearch, 300)
    return () => clearTimeout(t)
  }, [doSearch])

  // Load consumer location from localStorage
  useEffect(() => {
    const lat  = localStorage.getItem('yff_consumer_lat')
    const lng  = localStorage.getItem('yff_consumer_lng')
    const name = localStorage.getItem('yff_consumer_location_name')
    if (lat && lng) {
      setConsumerLat(Number(lat))
      setConsumerLng(Number(lng))
      setConsumerLocationName(name ?? '')
    } else if (!localStorage.getItem('yff_location_prompted')) {
      setShowLocationSheet(true)
    }
  }, [])

  const saveConsumerLocation = useCallback((lat: number, lng: number, name: string) => {
    setConsumerLat(lat)
    setConsumerLng(lng)
    setConsumerLocationName(name)
    localStorage.setItem('yff_consumer_lat', String(lat))
    localStorage.setItem('yff_consumer_lng', String(lng))
    localStorage.setItem('yff_consumer_location_name', name)
    localStorage.setItem('yff_location_prompted', '1')
    setShowLocationSheet(false)
  }, [])

  // Sort + distance-filter produce
  const displayItems = useMemo(() => {
    type WithDist = ProduceListing & { distKm: number | null }
    const withDist: WithDist[] = filtered.map((item) => ({
      ...item,
      distKm: (consumerLat && consumerLng && item.farmer?.lat && item.farmer?.lng)
        ? haversineKm(consumerLat, consumerLng, item.farmer.lat, item.farmer.lng)
        : null,
    }))
    if (!consumerLat || !consumerLng) return withDist
    let result = withDist
    if (distanceFilter) {
      result = result.filter((i) => i.distKm !== null && i.distKm <= distanceFilter)
    }
    return result.sort((a, b) => {
      if (a.distKm === null && b.distKm === null) return 0
      if (a.distKm === null) return 1
      if (b.distKm === null) return -1
      return a.distKm - b.distKm
    })
  }, [filtered, consumerLat, consumerLng, distanceFilter])

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

          {/* Location pill */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <button
              onClick={() => setShowLocationSheet(true)}
              className="inline-flex items-center gap-1.5 bg-green-800 border border-green-700 text-green-200 text-sm font-semibold px-4 py-2.5 rounded-full active:bg-green-700"
            >
              📍 {consumerLocationName || 'Set location / లొకేషన్ పెట్టండి'}
              <span className="text-green-400 text-xs ml-0.5">✎</span>
            </button>
            <Link
              href="/consumer/orders"
              className="inline-flex items-center gap-2 bg-green-800 border border-green-700 text-green-200 text-xs font-semibold px-4 py-2.5 rounded-full"
            >
              📦 My Orders / నా ఆర్డర్లు →
            </Link>
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

      {/* ── Distance filter chips (only when location set) ── */}
      {consumerLat && consumerLng && (
        <div className="max-w-3xl mx-auto mt-3 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {([null, 5, 10, 25] as const).map((d) => (
              <button
                key={d ?? 'all'}
                onClick={() => setDistanceFilter(d)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  distanceFilter === d
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {d === null ? 'All / అన్నీ' : `< ${d} km`}
              </button>
            ))}
          </div>
        </div>
      )}

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
              {displayItems.length} items / వస్తువులు
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : displayItems.length === 0 ? (
          distanceFilter ? (
            <DistanceEmptyState km={distanceFilter} onClear={() => setDistanceFilter(null)} />
          ) : (
            <EmptyState />
          )
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {displayItems.map((item) => (
              <ProduceCard key={item.id} item={item} distanceKm={'distKm' in item ? (item as ProduceListing & { distKm: number | null }).distKm : null} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {/* ── Location bottom sheet ─────────────── */}
      {showLocationSheet && (
        <LocationBottomSheet
          onSet={saveConsumerLocation}
          onClose={() => {
            localStorage.setItem('yff_location_prompted', '1')
            setShowLocationSheet(false)
          }}
        />
      )}
    </main>
  )
}

/* ─── Produce card ──────────────────────────────────────── */
function getUnitPrice(item: ProduceListing, qty: number) {
  const tier1Price = item.price_tier_1_price
  const tier1Qty = item.price_tier_1_qty
  const tier2Price = item.price_tier_2_price
  const tier2Qty = item.price_tier_2_qty
  const tier3Price = item.price_tier_3_price

  if (tier1Price == null) return null
  if (tier1Qty == null) return tier1Price
  if (qty <= tier1Qty) return tier1Price
  if (tier2Qty != null && tier2Price != null) {
    if (qty <= tier2Qty) return tier2Price
    return tier3Price ?? tier2Price
  }
  if (tier3Price != null) return tier3Price
  return tier1Price
}

function clampQuantity(nextQty: number, maxQty: number | null) {
  if (!Number.isFinite(nextQty)) return 1
  const floored = Math.max(1, Math.floor(nextQty))
  if (maxQty == null) return floored
  return Math.min(floored, maxQty)
}

function ProduceCard({ item, distanceKm }: { item: ProduceListing; distanceKm?: number | null }) {
  const emoji      = item.emoji ?? '🌿'
  const emojiBg    = EMOJI_BG[emoji] ?? 'bg-green-50'
  const method     = item.method?.toLowerCase() ?? 'natural'
  const badge      = METHOD_STYLE[method]  ?? 'bg-green-100 text-green-800'
  const badgeLabel = METHOD_LABEL[method] ?? 'Natural'
  const farmer     = item.farmer
  const farmerHref = farmer ? `/farmer/${farmer.slug}` : '#'
  const unit       = item.unit || 'kg'

  const { cart, addItem } = useCart()
  const inCart = cart[item.id]

  const [liveStock, setLiveStock] = useState<number | null>(item.stock_qty ?? null)
  const [stockMsg, setStockMsg]   = useState('')
  const [adding, setAdding]       = useState(false)
  const [added, setAdded]         = useState(false)
  const [quantity, setQuantity]   = useState(1)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => { setLiveStock(item.stock_qty ?? null) }, [item.stock_qty])

  const isOutOfStock = liveStock !== null && liveStock <= 0
  const maxQty = liveStock !== null && liveStock > 0 ? liveStock : null
  const selectedQty = clampQuantity(quantity, maxQty)
  const selectedUnitPrice = getUnitPrice(item, selectedQty)
  const totalAmount = selectedUnitPrice != null ? Number((selectedUnitPrice * selectedQty).toFixed(2)) : 0
  const upiId = farmer?.upi_id ?? ''
  const payeeName = resolveUpiPayeeName(farmer?.upi_name, farmer?.name)
  const whatsappMessage = buildWhatsAppOrderMessage({
    farmerName: farmer?.name ?? 'Farmer',
    farmerPhone: farmer?.phone ?? '',
    produceName: item.name,
    variety: item.variety,
    quantity: selectedQty,
    unit,
    totalAmount,
    upiId,
  })
  const whatsappUrl = buildWhatsAppUrl(farmer?.phone ?? '', whatsappMessage)
  const upiUrl = buildUpiPaymentUrl({
    upiId,
    payeeName,
    amount: totalAmount,
    produceName: item.name,
    variety: item.variety,
    quantity: selectedQty,
    unit,
  })
  const bulkPriceApplied = selectedUnitPrice != null
    && item.price_tier_1_price != null
    && selectedUnitPrice !== item.price_tier_1_price

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
      if (curQty + selectedQty > fresh) {
        const remaining = Math.max(fresh - curQty, 0)
        setStockMsg(
          remaining > 0
            ? `Stock updated / స్టాక్ మారింది, only ${remaining} ${unit} more can be added`
            : `Maximum available / గరిష్ట పరిమాణం: ${fresh} ${unit}`,
        )
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
      farmerPickupSlots: farmer.pickup_slots ?? null,
      farmerUpiId: farmer.upi_id ?? undefined,
      farmerUpiName: farmer.upi_name ?? farmer.name,
      farmerQrCodeUrl: farmer.upi_qr_code_url ?? undefined,
    }, selectedQty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const updateQuantity = (nextQty: number) => {
    if (isOutOfStock) return
    setStockMsg('')
    setQuantity(clampQuantity(nextQty, maxQty))
  }

  const handleCopyUpi = async () => {
    if (!upiId) return
    try {
      await navigator.clipboard.writeText(upiId)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    setTimeout(() => setCopyState('idle'), 1800)
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

        {/* Distance badge */}
        {distanceKm != null && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full self-start">
            📍 {formatDistance(distanceKm)} away
          </span>
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

        {/* Freshness badge */}
        {item.harvest_date && <FreshnessBadge harvestDate={item.harvest_date} />}

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

        {!farmer ? (
          <Link
            href={farmerHref}
            className="mt-2 block text-center w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            View / చూడండి
          </Link>
        ) : (
          <>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Quantity
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose how much to order
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Total
                  </p>
                  <p className="text-lg font-extrabold text-green-800">
                    {selectedUnitPrice != null ? `₹${totalAmount}` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center border border-gray-200 rounded-full bg-white">
                  <button
                    type="button"
                    onClick={() => updateQuantity(selectedQty - 1)}
                    disabled={selectedQty <= 1 || isOutOfStock}
                    className="w-10 h-10 rounded-l-full text-lg font-bold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed active:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <div className="min-w-[84px] px-2 text-center">
                    <p className="text-base font-extrabold text-gray-900">{selectedQty}</p>
                    <p className="text-[11px] text-gray-500">{unit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateQuantity(selectedQty + 1)}
                    disabled={isOutOfStock || (maxQty != null && selectedQty >= maxQty)}
                    className="w-10 h-10 rounded-r-full text-lg font-bold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed active:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {selectedUnitPrice != null ? `₹${selectedUnitPrice}/${unit}` : 'Price on request'}
                  </p>
                  {bulkPriceApplied ? (
                    <p className="text-[11px] font-semibold text-green-700 mt-0.5">
                      Bulk price applied
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {item.price_tier_1_price != null ? 'Price per unit' : 'Ask farmer for price'}
                    </p>
                  )}
                </div>
              </div>

              {maxQty != null && (
                <p className="text-[11px] text-gray-500">
                  Max available: {maxQty} {unit}
                </p>
              )}

              {isOutOfStock && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Out of stock right now. Please check with the farmer on WhatsApp.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!whatsappUrl || isOutOfStock) return
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
              }}
              disabled={!whatsappUrl || isOutOfStock}
              className="mt-2 flex items-center justify-center gap-2 w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm active:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <WhatsAppIcon />
              Order on WhatsApp
            </button>

            <button
              type="button"
              onClick={() => {
                if (!upiUrl || isOutOfStock) return
                window.location.href = upiUrl
              }}
              disabled={!upiUrl || isOutOfStock}
              className="mt-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Pay via UPI
            </button>

            {!upiId && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                UPI payment not available. Please order on WhatsApp.
              </p>
            )}

            {upiId && (
              <div className="mt-2 space-y-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      UPI ID
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 break-all mt-0.5">
                      {upiId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex-shrink-0 border border-gray-300 bg-white text-gray-800 font-bold px-3 py-2 rounded-lg text-xs active:bg-gray-100"
                  >
                    Copy UPI ID
                  </button>
                </div>
                {copyState === 'copied' && (
                  <p className="text-xs text-green-700 font-semibold text-center">
                    UPI ID copied
                  </p>
                )}
                {copyState === 'failed' && (
                  <p className="text-xs text-amber-700 text-center">
                    Copy failed. UPI ID is shown above for manual copy.
                  </p>
                )}
              </div>
            )}

            {farmer.upi_qr_code_url && (
              <details className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-3 text-sm font-bold text-gray-800">
                  <span>Scan QR to pay</span>
                  <span className="text-xs text-gray-400">Tap to view</span>
                </summary>
                <div className="px-3 pb-3 text-center">
                  <img
                    src={farmer.upi_qr_code_url}
                    alt={`UPI QR code for ${farmer.name}`}
                    className="mx-auto w-44 max-w-full rounded-xl border border-gray-100 bg-white"
                  />
                </div>
              </details>
            )}

            <button
              onClick={handleAdd}
              disabled={adding || isOutOfStock}
              className={`mt-2 flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm transition-colors ${
                added
                  ? 'bg-green-100 text-green-800'
                  : isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border border-green-200 bg-green-50 text-green-800 active:bg-green-100'
              } disabled:opacity-60`}
            >
              {added ? (
                <>✓ Added to cart / బుట్టకు చేర్చబడింది</>
              ) : (
                <>
                  <span className="text-lg leading-none">+</span>
                  {inCart ? `Add ${selectedQty} more to cart` : `Add ${selectedQty} to cart`}
                </>
              )}
            </button>

            {inCart && (
              <p className="mt-1 text-xs text-green-700 font-semibold text-center">
                In cart: {inCart.qty} {unit}
              </p>
            )}
          </>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/* ─── Distance empty state ──────────────────────────────── */
function DistanceEmptyState({ km, onClear }: { km: number; onClear: () => void }) {
  return (
    <div className="text-center py-14">
      <div className="text-6xl mb-4">📍</div>
      <p className="text-gray-800 font-bold text-lg">No farmers within {km} km</p>
      <p className="text-gray-500 text-sm mt-1">
        {km} కి.మీ లోపల రైతులు లేరు
      </p>
      <p className="text-gray-400 text-xs mt-2 leading-snug px-8">
        Farmers nearby may not have set their location yet.<br />
        దగ్గరలోని రైతులు ఇంకా లొకేషన్ పెట్టలేదు.
      </p>
      <button
        onClick={onClear}
        className="mt-5 bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm"
      >
        Show all produce / అన్ని పంటలు చూపించు
      </button>
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

/* ─── Location bottom sheet ─────────────────────────────────── */
function LocationBottomSheet({
  onSet,
  onClose,
}: {
  onSet: (lat: number, lng: number, name: string) => void
  onClose: () => void
}) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [gpsError, setGpsError]   = useState('')

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device / GPS అందుబాటులో లేదు')
      return
    }
    setGpsStatus('loading')
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const name = nearestTown(latitude, longitude)
        onSet(latitude, longitude, name)
      },
      (err) => {
        setGpsStatus('error')
        setGpsError(
          err.code === 1
            ? 'Location access denied. Search your town below. / లొకేషన్ అనుమతి లేదు. పట్టణం వెతకండి.'
            : 'Could not get GPS. Search your town below. / GPS రాలేదు. పట్టణం వెతకండి.'
        )
      },
      { timeout: 12000, enableHighAccuracy: true },
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg leading-tight">
              Where are you? / మీరు ఎక్కడ ఉన్నారు?
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              See produce from farmers near you / దగ్గరలోని రైతుల పంట చూడండి
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none p-1">×</button>
        </div>

        {/* GPS button */}
        <button
          onClick={handleGPS}
          disabled={gpsStatus === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-4 rounded-xl text-base active:bg-green-800 disabled:opacity-60"
        >
          {gpsStatus === 'loading' ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Detecting... / వెతుకుతోంది
            </>
          ) : (
            <>📍 Use my current location / నా లొకేషన్ వాడండి</>
          )}
        </button>

        {gpsError && (
          <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 leading-snug">{gpsError}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400 font-semibold">OR / లేదా</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Search input */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">
            Search your location / లొకేషన్ వెతకండి
          </label>
          <p className="text-[11px] text-gray-500 mb-2">
            Type any city, town or village in AP / Telangana<br />
            ఆంధ్రప్రదేశ్ / తెలంగాణలో ఏ పట్టణమైనా టైప్ చేయండి
          </p>
          <LocationSearch
            placeholder="e.g. Visakhapatnam, Hyderabad, Eluru..."
            onSelect={(lat, lng, name) => onSet(lat, lng, name)}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500 py-2"
        >
          Skip for now / తర్వాత చేస్తాను
        </button>
      </div>
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
      region_slug: localStorage.getItem('yff_consumer_location_name')?.toLowerCase().replace(/\s+/g, '') || 'tadepalligudem',
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
