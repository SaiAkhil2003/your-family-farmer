'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import LanguageToggle from '@/components/LanguageToggle'
import { useLang } from '@/lib/LanguageContext'

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
  pickup_locations: string[] | null
}

type DemandBar = {
  crop_name: string
  total_qty: number
}

type ListingRow = {
  id: string
  name: string
  variety: string | null
  emoji: string | null
  status: string
  method: string | null
  stock_qty: number | null
  price_tier_1_price: number | null
  price_tier_1_qty: number | null
  price_tier_2_price: number | null
  price_tier_2_qty: number | null
  price_tier_3_price: number | null
  description: string | null
  image_url: string | null
  brix: number | null
  soil_organic_carbon: number | null
  unit: string | null
  created_at: string
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'gram', label: 'gram' },
  { value: 'piece', label: 'piece / నగ' },
  { value: 'bunch', label: 'bunch / కట్ట' },
  { value: 'litre', label: 'litre' },
]

type PreviewData = {
  name: string
  variety: string
  emoji: string
  price: string
  method: string
  stock: string
}

const EMOJI_OPTIONS = ['🍅', '🍌', '🥭', '🫑', '🥬', '🍆', '🥕', '🌽', '🧅', '🧄', '🥦', '🌿', '🍓', '🫒', '🌾', '🥥']

const isProfileComplete = (f: Farmer | null) =>
  !!f && f.name?.trim().length > 0 && f.village?.trim().length > 0

export default function FarmerDashboard() {
  const router = useRouter()
  const { tx } = useLang()
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeListings, setActiveListings] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [demandBars, setDemandBars] = useState<DemandBar[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showListings, setShowListings] = useState(false)

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

    const [listingsRes, waClicksRes, intentsRes] = await Promise.all([
      supabase.from('produce_listings').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerData.id).eq('status', 'available'),
      supabase.from('wa_clicks').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerData.id).gte('clicked_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('demand_intents').select('crop_name, quantity_kg').eq('region_slug', farmerData.region_slug).eq('fulfilled', false),
    ])

    setActiveListings(listingsRes.count ?? 0)
    setOrdersCount(waClicksRes.count ?? 0)

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

  // Auto-open the profile edit modal the first time an incomplete farmer lands here.
  useEffect(() => {
    if (!loading && farmer && !isProfileComplete(farmer)) {
      setShowProfileEdit(true)
    }
  }, [loading, farmer])

  const handleLogout = () => {
    localStorage.removeItem('yff_farmer_id')
    localStorage.removeItem('yff_farmer_slug')
    router.replace('/farmer/login')
  }

  if (loading) return <LoadingScreen />
  if (notFound) return <FarmerNotFound onLogout={handleLogout} />

  const profileComplete = isProfileComplete(farmer)
  const displayName = farmer!.name?.trim() || tx.welcome

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-green-900 px-4 pt-6 pb-10">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-400 text-xs font-semibold mb-0.5 uppercase tracking-wide">
              {tx.farmerDashboard}
            </p>
            <h1 className="text-white text-xl font-extrabold leading-tight">{displayName}</h1>
            <p className="text-green-300 text-sm mt-0.5">
              {profileComplete
                ? `${farmer!.village}, ${farmer!.district}`
                : tx.completeProfilePrompt}
            </p>
            <p className="text-green-500 text-xs mt-1">+91 {farmer!.phone}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {profileComplete ? (
              <Link
                href={`/farmer/${farmer!.slug}`}
                className="bg-white text-green-800 text-xs font-bold px-3 py-2 rounded-xl"
              >
                {tx.viewProfile} ↗
              </Link>
            ) : (
              <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">
                {tx.incomplete}
              </span>
            )}
            <button
              onClick={() => setShowProfileEdit(true)}
              className="text-white text-xs underline"
            >
              {tx.editProfile}
            </button>
            <button onClick={handleLogout} className="text-green-500 text-xs underline">
              {tx.logout}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Complete profile banner */}
        {!profileComplete && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📝</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-900 text-base leading-tight">
                {tx.completeProfileTitle}
              </h3>
              <p className="text-amber-700 text-xs mt-0.5">
                {tx.completeProfileHelp}
              </p>
              <button
                onClick={() => setShowProfileEdit(true)}
                className="mt-3 bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm"
              >
                {tx.fillDetails}
              </button>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowListings(true)}
            className="border-green-200 bg-green-50 border rounded-2xl p-4 text-left active:bg-green-100 relative"
          >
            <div className="text-3xl font-black text-green-800">{activeListings}</div>
            <div className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{tx.activeListings}</div>
            <div className="text-[11px] font-bold text-green-700 mt-2 flex items-center gap-1">
              {tx.manage} <span aria-hidden>→</span>
            </div>
          </button>
          {[
            { label: tx.ordersThisWeek, value: ordersCount, color: 'border-blue-200 bg-blue-50', vcolor: 'text-blue-800' },
            { label: tx.avgRating, value: farmer!.rating_avg ? `${Number(farmer!.rating_avg).toFixed(1)} ★` : '—', color: 'border-amber-200 bg-amber-50', vcolor: 'text-amber-800' },
            { label: tx.totalBuyers, value: farmer!.buyer_count ?? 0, color: 'border-purple-200 bg-purple-50', vcolor: 'text-purple-800' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
              <div className={`text-3xl font-black ${s.vcolor}`}>{s.value}</div>
              <div className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Demand chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-extrabold text-gray-900 text-base leading-tight">
            {tx.localDemand}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">
            {tx.localDemandHelp}
          </p>

          {demandBars.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">{tx.noDemandSignals}</p>
              <p className="text-gray-400 text-xs mt-1">{tx.shareProfileLink}</p>
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

        {/* Add listing button */}
        {profileComplete ? (
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-white border-2 border-green-700 text-green-700 font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 active:bg-green-50"
            >
              <span className="text-xl leading-none">+</span>
              {tx.addNewProduce}
            </button>
          )
        ) : (
          <div className="w-full bg-gray-100 text-gray-500 font-semibold py-4 rounded-2xl text-sm text-center">
            {tx.completeBeforeAdd}
          </div>
        )}

        {/* Listing form */}
        {showForm && profileComplete && (
          <ProduceListingForm
            farmerId={farmer!.id}
            farmerSlug={farmer!.slug}
            defaultMethod={farmer!.method}
            onClose={() => setShowForm(false)}
            onPublished={() => { setShowForm(false); loadDashboard() }}
          />
        )}
      </div>

      {/* Manage listings modal */}
      {showListings && farmer && (
        <ManageListingsModal
          farmerId={farmer.id}
          defaultMethod={farmer.method ?? 'natural'}
          onClose={() => setShowListings(false)}
          onChanged={loadDashboard}
        />
      )}

      {/* Edit profile modal */}
      {showProfileEdit && farmer && (
        <ProfileEditModal
          farmer={farmer}
          onClose={() => {
            // If profile still incomplete, don't allow close (keep banner as fallback)
            if (isProfileComplete(farmer)) setShowProfileEdit(false)
            else setShowProfileEdit(false) // allow dismiss; banner still shown
          }}
          onSaved={(updated) => {
            setFarmer(updated)
            setShowProfileEdit(false)
          }}
        />
      )}
    </main>
  )
}

/* ─── Profile edit modal ─────────────────────────────────── */
function ProfileEditModal({
  farmer,
  onClose,
  onSaved,
}: {
  farmer: Farmer
  onClose: () => void
  onSaved: (updated: Farmer) => void
}) {
  const { tx } = useLang()
  const [name, setName] = useState(farmer.name ?? '')
  const [village, setVillage] = useState(farmer.village ?? '')
  const [district, setDistrict] = useState(farmer.district ?? '')
  const [method, setMethod] = useState(farmer.method ?? 'natural')
  const [sinceYear, setSinceYear] = useState(
    farmer.farming_since_year ? String(farmer.farming_since_year) : '',
  )
  const [pickupLocations, setPickupLocations] = useState<string[]>(
    Array.isArray(farmer.pickup_locations) ? farmer.pickup_locations : [],
  )
  const [newPickup, setNewPickup] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addPickup = () => {
    const v = newPickup.trim()
    if (!v) return
    if (pickupLocations.includes(v)) { setNewPickup(''); return }
    setPickupLocations((prev) => [...prev, v])
    setNewPickup('')
  }
  const removePickup = (loc: string) =>
    setPickupLocations((prev) => prev.filter((l) => l !== loc))

  const handleSave = async () => {
    if (!name.trim()) { setError(tx.nameRequired); return }
    if (!village.trim()) { setError(tx.villageRequired); return }
    setLoading(true)
    setError('')

    // Build a unique slug from the name once the farmer actually has one.
    // Only regenerate slug if current slug still looks auto-generated (f-<digits>-xxxx).
    const isAutoSlug = /^f-\d{10}-[a-z0-9]{4}$/.test(farmer.slug ?? '')
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'farmer'

    let newSlug = farmer.slug
    if (isAutoSlug && baseSlug) {
      const rand = Math.random().toString(36).slice(2, 5)
      newSlug = `${baseSlug}-${rand}`
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      village: village.trim(),
      district: district.trim(),
      method,
      slug: newSlug,
      pickup_locations: pickupLocations,
    }
    if (sinceYear) payload.farming_since_year = Number(sinceYear)

    const { data, error: err } = await supabase
      .from('farmers')
      .update(payload)
      .eq('id', farmer.id)
      .select('*')
      .single()

    setLoading(false)

    if (err || !data) {
      setError(err?.message ?? tx.couldNotSave)
      return
    }

    localStorage.setItem('yff_farmer_slug', data.slug)
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">
              {tx.profileModalTitle}
            </h3>
            <p className="text-xs text-gray-500">{tx.profileModalSubtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none p-1">×</button>
        </div>

        <div className="p-4 space-y-4">
          <Field
            label={tx.yourNameLabel}
            placeholder="Ramu Reddy"
            value={name}
            onChange={setName}
          />
          <Field
            label={tx.villageLabel}
            placeholder="Tadepalligudem"
            value={village}
            onChange={setVillage}
          />
          <Field
            label={tx.districtLabel}
            placeholder="West Godavari"
            value={district}
            onChange={setDistrict}
          />

          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">
              {tx.farmingMethodLabel}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 focus:outline-none"
            >
              <option value="natural">{tx.methodNatural}</option>
              <option value="organic">{tx.methodOrganic}</option>
              <option value="low_chemical">{tx.methodLowChemical}</option>
              <option value="chemical">{tx.methodChemical}</option>
            </select>
          </div>

          <Field
            label={tx.farmingSinceLabel}
            placeholder="e.g. 2005"
            value={sinceYear}
            onChange={setSinceYear}
            type="number"
          />

          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">
              {tx.pickupLocationsLabel}
            </label>
            <p className="text-[11px] text-gray-500 mb-2 leading-snug">
              {tx.pickupLocationsHelp}
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={tx.pickupPlaceholder}
                value={newPickup}
                onChange={(e) => setNewPickup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addPickup() }
                }}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addPickup}
                className="bg-green-700 text-white font-bold px-4 rounded-xl text-sm"
              >
                {tx.addBtn}
              </button>
            </div>
            {pickupLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pickupLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 rounded-full pl-3 pr-1 py-1 text-xs font-semibold"
                  >
                    📍 {loc}
                    <button
                      type="button"
                      onClick={() => removePickup(loc)}
                      className="w-5 h-5 rounded-full bg-green-200 text-green-800 text-sm leading-none flex items-center justify-center"
                      aria-label={`Remove ${loc}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !village.trim()}
            className="w-full bg-green-700 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:bg-green-800"
          >
            {loading ? tx.saving : tx.saveProfile}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
      />
    </div>
  )
}

/* ─── Produce listing form ──────────────────────────────────── */
function ProduceListingForm({
  farmerId,
  farmerSlug = '',
  defaultMethod,
  editData,
  onClose,
  onPublished,
}: {
  farmerId: string
  farmerSlug?: string
  defaultMethod: string
  editData?: ListingRow | null
  onClose: () => void
  onPublished: (saved?: Partial<ListingRow>) => void
}) {
  const { tx } = useLang()
  const isEdit = !!editData
  const [name, setName] = useState(editData?.name ?? '')
  const [variety, setVariety] = useState(editData?.variety ?? '')
  const [emoji, setEmoji] = useState(editData?.emoji ?? '🌿')
  const [qty, setQty] = useState(editData?.stock_qty != null ? String(editData.stock_qty) : '')
  const [period, setPeriod] = useState('')
  const [farmingMethod, setFarmingMethod] = useState(editData?.method ?? defaultMethod ?? 'natural')
  const [price1, setPrice1] = useState(editData?.price_tier_1_price != null ? String(editData.price_tier_1_price) : '')
  const [price1Qty, setPrice1Qty] = useState(editData?.price_tier_1_qty != null ? String(editData.price_tier_1_qty) : '5')
  const [price2, setPrice2] = useState(editData?.price_tier_2_price != null ? String(editData.price_tier_2_price) : '')
  const [price2Qty, setPrice2Qty] = useState(editData?.price_tier_2_qty != null ? String(editData.price_tier_2_qty) : '20')
  const [price3, setPrice3] = useState(editData?.price_tier_3_price != null ? String(editData.price_tier_3_price) : '')
  const [description, setDescription] = useState(editData?.description ?? '')
  const [brix, setBrix] = useState(editData?.brix != null ? String(editData.brix) : '')
  const [soc, setSoc] = useState(editData?.soil_organic_carbon != null ? String(editData.soil_organic_carbon) : '')
  const [unit, setUnit] = useState(editData?.unit ?? 'kg')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [existingImageUrl, setExistingImageUrl] = useState(editData?.image_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState('')
  const [saved, setSaved] = useState(false)

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(tx.pickImageFile)
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(tx.imageTooLarge)
      return
    }
    setError('')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    setExistingImageUrl('')
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${farmerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('farm-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) {
      setError(`Image upload failed: ${upErr.message}`)
      return null
    }
    const { data } = supabase.storage.from('farm-images').getPublicUrl(path)
    return data.publicUrl
  }

  const previewData: PreviewData = {
    name: name || 'Produce name',
    variety: variety || '',
    emoji,
    price: price1 || '—',
    method: farmingMethod,
    stock: qty || '—',
  }

  const handlePublish = async () => {
    if (!name.trim()) { setError(tx.produceNameRequired); return }
    setLoading(true)
    setError('')

    let imageUrl: string | null = null
    if (imageFile) {
      imageUrl = await uploadImage(imageFile)
      if (!imageUrl) { setLoading(false); return }
    } else if (existingImageUrl) {
      imageUrl = existingImageUrl
    }

    if (isEdit && editData) {
      // Edit mode: always send all fields so clearing a value actually clears it in DB
      const editPayload: Record<string, unknown> = {
        name: name.trim(),
        emoji,
        method: farmingMethod,
        unit,
        variety: variety.trim() || null,
        stock_qty: qty ? Number(qty) : null,
        description: description.trim() || null,
        brix: brix ? Number(brix) : null,
        soil_organic_carbon: soc ? Number(soc) : null,
        price_tier_1_price: price1 ? Number(price1) : null,
        price_tier_1_qty: price1 ? Number(price1Qty) : null,
        price_tier_2_price: price2 ? Number(price2) : null,
        price_tier_2_qty: price2 ? Number(price2Qty) : null,
        price_tier_3_price: price3 ? Number(price3) : null,
        price_tier_3_qty: price3 ? Number(Number(price2Qty) + 1) : null,
        image_url: imageUrl,
      }

      let res: Response
      try {
        res = await fetch('/api/farmer/update-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: editData.id, farmerId, payload: editPayload }),
        })
      } catch {
        setLoading(false)
        setError('Network error — is the server running?')
        return
      }
      const json = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok) { setError(json.error ?? 'Could not save changes'); return }
      setSaved(true)
      setTimeout(() => onPublished(editPayload as Partial<ListingRow>), 1200)
      return
    }

    // Insert mode: only include fields that have values
    const payload: Record<string, unknown> = {
      name: name.trim(),
      emoji,
      method: farmingMethod,
      unit,
    }
    if (variety.trim()) payload.variety = variety.trim()
    if (qty) payload.stock_qty = Number(qty)
    if (description.trim()) payload.description = description.trim()
    else payload.description = null
    if (brix) payload.brix = Number(brix)
    if (soc) payload.soil_organic_carbon = Number(soc)
    if (price1) { payload.price_tier_1_price = Number(price1); payload.price_tier_1_qty = Number(price1Qty) }
    if (price2) { payload.price_tier_2_price = Number(price2); payload.price_tier_2_qty = Number(price2Qty) }
    if (price3) { payload.price_tier_3_price = Number(price3); payload.price_tier_3_qty = Number(price2Qty) + 1 }
    payload.image_url = imageUrl

    const insertPayload = { ...payload, farmer_id: farmerId, status: 'available' }
    const { error: err } = await supabase.from('produce_listings').insert(insertPayload)
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
        <p className="font-extrabold text-green-800 text-lg">{tx.publishedTitle}</p>
        <p className="text-green-700 text-sm">{tx.listingLive}</p>
        <Link
          href={`/farmer/${publishedSlug}`}
          className="inline-block bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          {tx.viewYourProfile} ↗
        </Link>
      </div>
    )
  }

  if (saved && isEdit) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="font-extrabold text-green-800 text-lg">{tx.savedTitle}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-extrabold text-gray-900 text-base">
          {isEdit ? tx.editProduceListing : tx.newProduceListing}
        </h3>
        <button onClick={onClose} className="text-gray-400 text-2xl leading-none p-1">×</button>
      </div>

      <div className="p-4 space-y-5">
        {/* Emoji picker */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">{tx.pickIcon}</p>
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

        {/* Unit selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Unit / కొలత
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 focus:outline-none"
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Name + variety */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.produceDetails}
          </label>
          <input
            type="text"
            placeholder={tx.produceNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder={tx.varietyPlaceholder}
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Qty + period */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.availability}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={`Quantity (${unit})`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder={tx.periodPlaceholder}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Farming method */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.farmingMethodLabel}
          </label>
          <select
            value={farmingMethod}
            onChange={(e) => setFarmingMethod(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 focus:outline-none"
          >
            <option value="natural">{tx.methodNatural}</option>
            <option value="organic">{tx.methodOrganic}</option>
            <option value="low_chemical">{tx.methodLowChemical}</option>
            <option value="chemical">{tx.methodChemical}</option>
          </select>
        </div>

        {/* Delivery method */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.deliveryMethod}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 border-2 border-green-600 bg-green-50 rounded-xl px-3 py-3">
              <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
              <span className="text-sm font-semibold text-green-800">{tx.pickupOnly}</span>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-xl px-3 py-3 opacity-50 cursor-not-allowed">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-gray-400">{tx.courierOption}</span>
                <span className="block text-[10px] text-gray-400">{tx.courierComingSoon}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.pricingTiers}
          </label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Tier 1</span>
              <input
                type="number"
                placeholder={`Up to ${price1Qty}`}
                value={price1Qty}
                onChange={(e) => setPrice1Qty(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">{unit} →</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder={`Price/${unit}`}
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
                placeholder={`Up to`}
                value={price2Qty}
                onChange={(e) => setPrice2Qty(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">{unit} →</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder={`Price/${unit}`}
                  value={price2}
                  onChange={(e) => setPrice2(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Tier 3</span>
              <span className="text-xs text-gray-400 w-20 text-center">{Number(price2Qty) + 1}+ {unit}</span>
              <span className="text-xs text-gray-400">→</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  placeholder={`Price/${unit}`}
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
            {tx.description}
          </label>
          <textarea
            placeholder={tx.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:border-green-500 focus:outline-none"
          />
          <p className="text-right text-xs text-gray-400">{description.length}/500</p>
        </div>

        {/* Produce photo */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.photoOptional}
          </label>
          {(imagePreview || existingImageUrl) ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview || existingImageUrl}
                alt="Preview"
                className="w-full max-h-64 object-cover rounded-xl border border-gray-200 bg-gray-50"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-white/90 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold shadow"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-green-300 rounded-xl py-4 px-3 text-green-700 text-sm font-bold cursor-pointer active:bg-green-50">
                <span className="text-lg leading-none">📷</span>
                {tx.takePhoto}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePickImage}
                  className="hidden"
                />
              </label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-green-300 rounded-xl py-4 px-3 text-green-700 text-sm font-bold cursor-pointer active:bg-green-50">
                <span className="text-lg leading-none">🖼</span>
                {tx.fromGallery}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePickImage}
                  className="hidden"
                />
              </label>
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            {tx.buyersSeeCard}
          </p>
        </div>

        {/* Quality params */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {tx.qualityParams}
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
            {tx.preview}
          </button>
          <button
            onClick={handlePublish}
            disabled={loading || !name.trim()}
            className="flex-1 bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? (isEdit ? tx.saving : tx.publishing) : (isEdit ? tx.saveChanges : tx.publish)}
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
  const { tx } = useLang()
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
          <p className="font-bold text-gray-800 text-sm">
            {tx.previewHeading}
          </p>
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
                {tx.previewOrderBtn}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            {tx.previewFooter}
          </p>
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm"
          >
            {tx.close}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Manage listings modal ────────────────────────────────── */
function ManageListingsModal({
  farmerId,
  defaultMethod,
  onClose,
  onChanged,
}: {
  farmerId: string
  defaultMethod: string
  onClose: () => void
  onChanged: () => void
}) {
  const { tx } = useLang()
  const [rows, setRows] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingRow, setEditingRow] = useState<ListingRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('produce_listings')
      .select('id, name, variety, emoji, status, method, stock_qty, price_tier_1_price, price_tier_1_qty, price_tier_2_price, price_tier_2_qty, price_tier_3_price, description, image_url, brix, soil_organic_carbon, unit, created_at')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) { setError(err.message); return }
    setRows((data ?? []) as ListingRow[])
  }, [farmerId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (row: ListingRow) => {
    if (!confirm(tx.confirmDelete.replace('{name}', row.name))) return

    setDeletingId(row.id)
    setError('')
    const { data, error: err } = await supabase
      .from('produce_listings')
      .delete()
      .eq('id', row.id)
      .select('id')
    setDeletingId(null)

    if (err) {
      setError(err.message)
      return
    }
    if (!data || data.length === 0) {
      setError(tx.deleteBlocked)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    onChanged()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base leading-tight">
              {tx.yourProduce}
            </h3>
            <p className="text-xs text-gray-500">{tx.manageOrDelete}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none p-1">×</button>
        </div>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 text-sm mt-3">{tx.loadingLabel}</p>
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {!loading && rows.length === 0 && !error && (
            <div className="text-center py-10">
              <div className="text-5xl mb-2">🌾</div>
              <p className="font-semibold text-gray-700 text-sm">{tx.noProduceYet}</p>
            </div>
          )}

          {!loading && rows.map((row) => (
            <ListingRowCard
              key={row.id}
              row={row}
              deleting={deletingId === row.id}
              onDelete={() => handleDelete(row)}
              onEdit={() => setEditingRow(row)}
            />
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm"
          >
            {tx.close}
          </button>
        </div>
      </div>

      {/* Edit listing overlay */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <ProduceListingForm
              farmerId={farmerId}
              defaultMethod={defaultMethod}
              editData={editingRow}
              onClose={() => setEditingRow(null)}
              onPublished={(saved) => {
                if (saved && editingRow) {
                  setRows((prev) => prev.map((r) => r.id === editingRow.id ? { ...r, ...saved } : r))
                }
                setEditingRow(null)
                load()
                onChanged()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ListingRowCard({
  row,
  deleting,
  onDelete,
  onEdit,
}: {
  row: ListingRow
  deleting: boolean
  onDelete: () => void
  onEdit: () => void
}) {
  const { tx } = useLang()
  const emoji = row.emoji ?? '🌿'
  const statusLabel =
    row.status === 'available'
      ? tx.availableLabel
      : row.status === 'coming_soon'
      ? tx.comingSoon
      : row.status
  const statusColor =
    row.status === 'available'
      ? 'bg-green-100 text-green-800'
      : row.status === 'coming_soon'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex gap-3 p-3">
        {row.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image_url}
            alt={row.name}
            loading="lazy"
            className="rounded-xl w-16 h-16 object-cover flex-shrink-0 bg-gray-100"
          />
        ) : (
          <div className="bg-green-50 rounded-xl w-16 h-16 flex items-center justify-center text-3xl flex-shrink-0">
            {emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{row.name}</h4>
              {row.variety && <p className="text-xs text-gray-500 truncate">{row.variety}</p>}
            </div>
            <span className={`${statusColor} text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            {row.price_tier_1_price != null && (
              <span className="font-bold text-green-700 text-sm">
                ₹{row.price_tier_1_price}
                <span className="text-gray-400 font-normal text-xs">/{row.unit || 'kg'}</span>
              </span>
            )}
            {row.stock_qty != null && (
              <span className="font-semibold text-gray-700">{row.stock_qty} {row.unit || tx.kgLabel}</span>
            )}
            {row.method && (
              <span className="bg-green-50 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {row.method}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 border border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl text-sm active:bg-blue-50"
        >
          ✏️ {tx.editListing}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-sm active:bg-red-50 disabled:opacity-50"
        >
          {deleting ? tx.deleting : `🗑 ${tx.deleteProduce}`}
        </button>
      </div>
    </div>
  )
}

/* ─── Loading screen ────────────────────────────────────────── */
function LoadingScreen() {
  const { tx } = useLang()
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">{tx.loadingLabel}</p>
      </div>
    </main>
  )
}

/* ─── Farmer not found ──────────────────────────────────────── */
function FarmerNotFound({ onLogout }: { onLogout: () => void }) {
  const { tx } = useLang()
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="text-6xl">🌾</div>
        <h2 className="text-xl font-extrabold text-gray-900">{tx.sessionExpired}</h2>
        <p className="text-gray-500 text-sm">{tx.sessionExpiredHelp}</p>
        <button onClick={onLogout} className="bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm">
          {tx.loginAgain}
        </button>
      </div>
    </main>
  )
}
