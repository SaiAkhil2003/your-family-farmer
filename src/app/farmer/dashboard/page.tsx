'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Farmer = {
  id: string
  name: string
  slug: string
  village: string
  district: string
  phone: string
  method: string
  region_slug: string
  rating_avg: number | null
  buyer_count: number
  farming_since_year: number | null
}

type DemandBar = {
  crop_name: string
  total_qty: number
}

type PreviewData = {
  name: string
  variety: string
  emoji: string
  price: string
  method: string
  stock: string
}

const EMOJI_OPTIONS = ['🍅', '🍌', '🥭', '🫑', '🥬', '🍆', '🥕', '🌽', '🧅', '🧄', '🥦', '🌿', '🍓', '🫒', '🌾', '🥥']

export default function FarmerDashboard() {
  const router = useRouter()
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeListings, setActiveListings] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [demandBars, setDemandBars] = useState<DemandBar[]>([])
  const [showForm, setShowForm] = useState(false)

  const loadDashboard = useCallback(async () => {
    const farmerId = localStorage.getItem('yff_farmer_id')
    if (!farmerId) { router.replace('/farmer/login'); return }

    const { data: farmerData } = await supabase
      .from('farmers')
      .select('*')
      .eq('id', farmerId)
      .maybeSingle()

    if (!farmerData) { setNotFound(true); setLoading(false); return }
    setFarmer(farmerData)

    const [listingsRes, ordersRes, intentsRes] = await Promise.all([
      supabase.from('produce_listings').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerData.id).eq('status', 'available'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerData.id).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('demand_intents').select('crop_name, quantity_kg').eq('region_slug', farmerData.region_slug).eq('fulfilled', false),
    ])

    setActiveListings(listingsRes.count ?? 0)
    setOrdersCount(ordersRes.count ?? 0)

    const map: Record<string, number> = {}
    for (const row of intentsRes.data ?? []) {
      map[row.crop_name] = (map[row.crop_name] ?? 0) + (Number(row.quantity_kg) || 0)
    }
    setDemandBars(
      Object.entries(map)
        .map(([crop_name, total_qty]) => ({ crop_name, total_qty }))
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 5)
    )

    setLoading(false)
  }, [router])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleLogout = () => {
    localStorage.removeItem('yff_farmer_id')
    localStorage.removeItem('yff_farmer_slug')
    router.replace('/farmer/login')
  }

  if (loading) return <LoadingScreen />
  if (notFound) return <FarmerNotFound onLogout={handleLogout} />

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-green-900 px-4 pt-6 pb-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-400 text-xs font-semibold mb-0.5 uppercase tracking-wide">
              Farmer Dashboard
            </p>
            <h1 className="text-white text-xl font-extrabold leading-tight">{farmer!.name}</h1>
            <p className="text-green-300 text-sm mt-0.5">
              {farmer!.village}, {farmer!.district}
            </p>
            <p className="text-green-500 text-xs mt-1">
              Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Link
              href={`/farmer/${farmer!.slug}`}
              className="bg-white text-green-800 text-xs font-bold px-3 py-2 rounded-xl"
            >
              View profile ↗
            </Link>
            <button onClick={handleLogout} className="text-green-500 text-xs underline">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Active listings', sub: 'చురుకైన పంటలు', value: activeListings, color: 'border-green-200 bg-green-50', vcolor: 'text-green-800' },
            { label: 'Orders this week', sub: 'ఈ వారం ఆర్డర్లు', value: ordersCount, color: 'border-blue-200 bg-blue-50', vcolor: 'text-blue-800' },
            { label: 'Avg rating', sub: 'సగటు రేటింగ్', value: farmer!.rating_avg ? `${Number(farmer!.rating_avg).toFixed(1)} ★` : '—', color: 'border-amber-200 bg-amber-50', vcolor: 'text-amber-800' },
            { label: 'Total buyers', sub: 'మొత్తం కొనుగోలుదారులు', value: farmer!.buyer_count ?? 0, color: 'border-purple-200 bg-purple-50', vcolor: 'text-purple-800' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
              <div className={`text-3xl font-black ${s.vcolor}`}>{s.value}</div>
              <div className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{s.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Demand chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-extrabold text-gray-900 text-base leading-tight">
            Local demand
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">
            మీ ప్రాంతంలో వినియోగదారులు ఏమి కోరుతున్నారు
          </p>

          {demandBars.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No demand signals yet.</p>
              <p className="text-gray-400 text-xs mt-1">Share your profile link to attract buyers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {demandBars.map((bar) => {
                const pct = Math.round((bar.total_qty / demandBars[0].total_qty) * 100)
                return (
                  <div key={bar.crop_name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{bar.crop_name}</span>
                      <span className="text-xs text-gray-400 font-medium">{bar.total_qty} kg</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Voice registration */}
        <a
          href="https://wa.me/917601059161?text=REGISTER"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-700 text-white rounded-2xl p-4 w-full active:bg-green-800"
        >
          <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="currentColor" stroke="none"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">Register via voice (Telugu / Hindi)</p>
            <p className="text-green-200 text-xs mt-0.5">వాయిస్ ద్వారా నమోదు చేయండి</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        {/* Add listing button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-white border-2 border-green-700 text-green-700 font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 active:bg-green-50"
          >
            <span className="text-xl leading-none">+</span>
            Add new produce listing
          </button>
        )}

        {/* Listing form */}
        {showForm && (
          <ProduceListingForm
            farmerId={farmer!.id}
            farmerSlug={farmer!.slug}
            defaultMethod={farmer!.method}
            onClose={() => setShowForm(false)}
            onPublished={() => { setShowForm(false); loadDashboard() }}
          />
        )}
      </div>
    </main>
  )
}

/* ─── Produce listing form ──────────────────────────────────── */
function ProduceListingForm({
  farmerId,
  farmerSlug,
  defaultMethod,
  onClose,
  onPublished,
}: {
  farmerId: string
  farmerSlug: string
  defaultMethod: string
  onClose: () => void
  onPublished: () => void
}) {
  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [emoji, setEmoji] = useState('🌿')
  const [qty, setQty] = useState('')
  const [period, setPeriod] = useState('')
  const [farmingMethod, setFarmingMethod] = useState(defaultMethod || 'natural')
  const [price1, setPrice1] = useState('')
  const [price1Qty, setPrice1Qty] = useState('5')
  const [price2, setPrice2] = useState('')
  const [price2Qty, setPrice2Qty] = useState('20')
  const [price3, setPrice3] = useState('')
  const [description, setDescription] = useState('')
  const [brix, setBrix] = useState('')
  const [soc, setSoc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState('')

  const previewData: PreviewData = {
    name: name || 'Produce name',
    variety: variety || '',
    emoji,
    price: price1 || '—',
    method: farmingMethod,
    stock: qty || '—',
  }

  const handlePublish = async () => {
    if (!name.trim()) { setError('Produce name is required'); return }
    setLoading(true)
    setError('')

    const payload: Record<string, unknown> = {
      farmer_id: farmerId,
      name: name.trim(),
      emoji,
      status: 'available',
      method: farmingMethod,
    }
    if (variety.trim()) payload.variety = variety.trim()
    if (qty) payload.stock_qty = Number(qty)
    if (description.trim()) payload.description = description.trim()
    if (brix) payload.brix = Number(brix)
    if (soc) payload.soil_organic_carbon = Number(soc)
    if (price1) { payload.price_tier_1_price = Number(price1); payload.price_tier_1_qty = Number(price1Qty) }
    if (price2) { payload.price_tier_2_price = Number(price2); payload.price_tier_2_qty = Number(price2Qty) }
    if (price3) { payload.price_tier_3_price = Number(price3); payload.price_tier_3_qty = Number(price2Qty) + 1 }

    const { error: err } = await supabase.from('produce_listings').insert(payload)
    setLoading(false)

    if (err) { setError(err.message); return }

    setPublished(true)
    setPublishedSlug(farmerSlug)
    setTimeout(() => onPublished(), 2500)
  }

  if (published) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="font-extrabold text-green-800 text-lg">Published!</p>
        <p className="text-green-700 text-sm">Your listing is now live on the consumer page.</p>
        <Link
          href={`/farmer/${publishedSlug}`}
          className="inline-block bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          View your profile ↗
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-extrabold text-gray-900 text-base">New produce listing</h3>
        <button onClick={onClose} className="text-gray-400 text-2xl leading-none p-1">×</button>
      </div>

      <div className="p-4 space-y-5">
        {/* Emoji picker */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Pick an icon</p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name + variety */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Produce details</label>
          <input
            type="text"
            placeholder="Produce name * (e.g. Tomato / టమాటా)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Variety (e.g. Naati heirloom)"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Qty + period */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Availability</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Quantity (kg)"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Period (e.g. Apr–May)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Farming method */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Farming method</label>
          <select
            value={farmingMethod}
            onChange={(e) => setFarmingMethod(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 focus:outline-none"
          >
            <option value="natural">🌱 Natural / సహజం</option>
            <option value="organic">🍃 Organic / సేంద్రీయ</option>
            <option value="low_chemical">⚡ Low chemical</option>
            <option value="chemical">Chemical</option>
          </select>
        </div>

        {/* Delivery method */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Delivery method</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 border-2 border-green-600 bg-green-50 rounded-xl px-3 py-3">
              <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
              <span className="text-sm font-semibold text-green-800">Pickup only</span>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-xl px-3 py-3 opacity-50 cursor-not-allowed">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-gray-400">I will courier</span>
                <span className="block text-[10px] text-gray-400">Coming soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pricing tiers</label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Tier 1</span>
              <input
                type="number"
                placeholder={`Up to ${price1Qty} kg qty`}
                value={price1Qty}
                onChange={(e) => setPrice1Qty(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">kg →</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder="Price/kg"
                  value={price1}
                  onChange={(e) => setPrice1(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Tier 2</span>
              <input
                type="number"
                placeholder="Up to kg"
                value={price2Qty}
                onChange={(e) => setPrice2Qty(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">kg →</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder="Price/kg"
                  value={price2}
                  onChange={(e) => setPrice2(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Tier 3</span>
              <span className="text-xs text-gray-400 w-20 text-center">{Number(price2Qty) + 1}+ kg</span>
              <span className="text-xs text-gray-400">→</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder="Price/kg"
                  value={price3}
                  onChange={(e) => setPrice3(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Description / Growing notes
          </label>
          <textarea
            placeholder="Tell buyers how you grow this produce... (max 500 chars)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:border-green-500 focus:outline-none"
          />
          <p className="text-right text-xs text-gray-400">{description.length}/500</p>
        </div>

        {/* Quality params */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Quality parameters (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">BRIX reading</p>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 8.5"
                value={brix}
                onChange={(e) => setBrix(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Soil Organic Carbon %</p>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 2.1"
                value={soc}
                onChange={(e) => setSoc(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Preview + Publish buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setPreview(true)}
            className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3.5 rounded-xl text-sm"
          >
            Preview listing
          </button>
          <button
            onClick={handlePublish}
            disabled={loading || !name.trim()}
            className="flex-1 bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish listing'}
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <PreviewModal data={previewData} onClose={() => setPreview(false)} />
      )}
    </div>
  )
}

/* ─── Preview modal ─────────────────────────────────────────── */
function PreviewModal({ data, onClose }: { data: PreviewData; onClose: () => void }) {
  const EMOJI_BG: Record<string, string> = {
    '🍅': 'bg-red-100', '🥬': 'bg-green-100', '🥭': 'bg-orange-100',
    '🍆': 'bg-purple-100', '🥕': 'bg-orange-100', '🌽': 'bg-yellow-100',
    '🍌': 'bg-yellow-100', '🫑': 'bg-green-100', '🌿': 'bg-green-50',
    '🌾': 'bg-amber-100', '🍓': 'bg-red-50',
  }
  const bg = EMOJI_BG[data.emoji] ?? 'bg-green-50'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-800 text-sm">Preview — how buyers will see this</p>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-[180px] mx-auto">
            <div className={`${bg} flex items-center justify-center py-8`}>
              <span className="text-5xl">{data.emoji}</span>
            </div>
            <div className="p-3">
              <h3 className="font-extrabold text-gray-900 text-base">{data.name}</h3>
              {data.variety && <p className="text-xs text-gray-400 mt-0.5">{data.variety}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="text-green-700 font-black text-lg">
                  {data.price !== '—' ? `₹${data.price}` : '—'}
                  <span className="text-xs font-normal text-gray-400">/kg</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  {data.method}
                </span>
              </div>
              {data.stock !== '—' && (
                <p className="text-xs text-gray-400 mt-1">{data.stock} kg left</p>
              )}
              <div className="mt-2 w-full bg-green-700 text-white text-xs font-bold py-2.5 rounded-xl text-center">
                Order / ఆర్డర్
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            This is how the card appears on the consumer home page.
          </p>
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm"
          >
            Close preview
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Loading screen ────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    </main>
  )
}

/* ─── Farmer not found ──────────────────────────────────────── */
function FarmerNotFound({ onLogout }: { onLogout: () => void }) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="text-6xl">🌾</div>
        <h2 className="text-xl font-extrabold text-gray-900">Farmer profile not found</h2>
        <p className="text-gray-500 text-sm">
          Your phone number is not linked to a farmer profile yet.
          Contact the YourFamilyFarmer team to get set up.
        </p>
        <a
          href="https://wa.me/917601059161?text=Hi, I want to register as a farmer on YourFamilyFarmer"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Contact us on WhatsApp
        </a>
        <button onClick={onLogout} className="block w-full text-gray-400 text-sm underline mt-2">
          Logout
        </button>
      </div>
    </main>
  )
}
