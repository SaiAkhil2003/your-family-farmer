'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LanguageContext'
import { FreshnessBadge } from '@/components/FreshnessBadge'
import { useCart } from '@/components/consumer/Cart'
import {
  buildUpiPaymentUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  resolveUpiPayeeName,
} from '@/lib/upi'

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
  description?: string
  image_url?: string
  harvest_date?: string | null
  unit?: string
}

type PickupSlots = { days: string[]; time_from: string; time_to: string }

type Farmer = {
  id?: string
  name?: string
  phone?: string
  village?: string
  slug?: string
  pickup_locations?: string[] | null
  pickup_slots?: PickupSlots | null
  upi_id?: string | null
  upi_name?: string | null
  upi_qr_code_url?: string | null
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
  const { addItem } = useCart()
  const [listings, setListings] = useState<Produce[]>(produce as Produce[])
  const available = listings.filter((p) => p.status === 'available')
  const comingSoon = listings.filter((p) => p.status === 'coming_soon')

  const handleProduceAdded = (newItem: Produce) => {
    setListings((prev) => [newItem, ...prev])
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? / మీరు నిశ్చితంగా ఉన్నారా?')) return
    const { error } = await supabase.from('produce_listings').delete().eq('id', id)
    if (error) {
      alert(`Could not delete: ${error.message}`)
      return
    }
    setListings((prev) => prev.filter((p) => p.id !== id))
  }

  const farmerCartInfo = {
    farmerId: f.id ?? '',
    farmerName: f.name ?? '',
    farmerPhone: f.phone ?? '',
    farmerVillage: f.village ?? '',
    farmerSlug: f.slug ?? '',
    farmerPickupLocations: Array.isArray(f.pickup_locations) ? f.pickup_locations : [],
    farmerPickupSlots: f.pickup_slots ?? null,
    farmerUpiId: f.upi_id ?? undefined,
    farmerUpiName: f.upi_name ?? f.name ?? undefined,
    farmerQrCodeUrl: f.upi_qr_code_url ?? undefined,
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
              <ProduceCard
                key={item.id}
                item={item}
                farmerInfo={farmerCartInfo}
                onAddToCart={(qty) => addItem({
                  listingId: item.id,
                  name: item.name,
                  variety: item.variety,
                  emoji: item.emoji,
                  pricePerKg: item.price_tier_1_price,
                  priceTier1Qty: item.price_tier_1_qty,
                  priceTier1Price: item.price_tier_1_price,
                  priceTier2Qty: item.price_tier_2_qty,
                  priceTier2Price: item.price_tier_2_price,
                  priceTier3Price: item.price_tier_3_price,
                  unit: item.unit,
                  stockQty: item.stock_qty,
                  ...farmerCartInfo,
                }, qty)}
                onDelete={isEditMode ? () => handleDelete(item.id) : undefined}
              />
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
              <ComingSoonCard
                key={item.id}
                item={item}
                farmerId={item.id}
                onDelete={isEditMode ? () => handleDelete(item.id) : undefined}
              />
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
    setError('')

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
        <span className="text-lg">+</span> Add your produce / మీ పంట చేర్చండి
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">Add produce / పంట చేర్చండి</h3>
        <button onClick={() => { reset(); setOpen(false) }} className="text-gray-400 text-lg leading-none">×</button>
      </div>

      {/* Emoji picker */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Pick an icon / ఐకాన్ ఎంచుకోండి</p>
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
          placeholder="Produce name / పంట పేరు (e.g. Papaya)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Variety (optional) / రకం"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Price + stock */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Price / kg (₹) / ధర"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Stock (kg) / నిల్వ"
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
            {s === 'available' ? 'Available now / అందుబాటులో' : 'Coming soon / త్వరలో'}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-center text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {success ? (
        <p className="text-center text-sm text-green-700 font-semibold py-1">
          ✓ Added successfully! / చేర్చబడింది!
        </p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Adding... / చేరుస్తోంది' : 'Add produce / పంట చేర్చండి'}
        </button>
      )}
    </div>
  )
}

type FarmerCartInfo = {
  farmerId: string
  farmerName: string
  farmerPhone: string
  farmerVillage: string
  farmerSlug: string
  farmerPickupLocations: string[]
  farmerPickupSlots: PickupSlots | null
  farmerUpiId?: string
  farmerUpiName?: string
  farmerQrCodeUrl?: string
}

function getUnitPrice(item: Produce, qty: number) {
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

function ProduceCard({
  item,
  farmerInfo,
  onAddToCart,
  onDelete,
}: {
  item: Produce
  farmerInfo: FarmerCartInfo
  onAddToCart: (qty: number) => void
  onDelete?: () => void
}) {
  const { tx } = useLang()
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const bgColors: Record<string, string> = {
    '🍅': 'bg-red-100', '🥬': 'bg-green-100', '🥭': 'bg-orange-100',
    '🍆': 'bg-purple-100', '🥕': 'bg-orange-100', '🌽': 'bg-yellow-100',
    '🍌': 'bg-yellow-100', '🫑': 'bg-green-100',
  }
  const emoji = item.emoji ?? '🌿'
  const bg = bgColors[emoji] ?? 'bg-green-100'
  const unit = item.unit ?? 'kg'
  const hasPrice = item.price_tier_1_price != null
  const maxQty = item.stock_qty != null && item.stock_qty > 0 ? item.stock_qty : null
  const isOutOfStock = item.stock_qty != null && item.stock_qty <= 0
  const selectedQty = clampQuantity(quantity, maxQty)
  const selectedUnitPrice = getUnitPrice(item, selectedQty)
  const totalAmount = selectedUnitPrice != null ? Number((selectedUnitPrice * selectedQty).toFixed(2)) : 0
  const payeeName = resolveUpiPayeeName(farmerInfo.farmerUpiName, farmerInfo.farmerName)
  const upiId = farmerInfo.farmerUpiId ?? ''
  const whatsappMessage = buildWhatsAppOrderMessage({
    farmerName: farmerInfo.farmerName,
    farmerPhone: farmerInfo.farmerPhone,
    produceName: item.name,
    variety: item.variety,
    quantity: selectedQty,
    unit,
    totalAmount,
    upiId,
  })
  const whatsappUrl = buildWhatsAppUrl(farmerInfo.farmerPhone, whatsappMessage)
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

  const updateQuantity = (nextQty: number) => {
    if (isOutOfStock) return
    setQuantity(clampQuantity(nextQty, maxQty))
  }

  const handleAdd = () => {
    onAddToCart(selectedQty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
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
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="flex gap-3 p-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="rounded-xl w-14 h-14 object-cover flex-shrink-0 bg-gray-100"
          />
        ) : (
          <div className={`${bg} rounded-xl w-14 h-14 flex items-center justify-center text-3xl flex-shrink-0`}>
            {emoji}
          </div>
        )}
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
            {item.harvest_date && <FreshnessBadge harvestDate={item.harvest_date} />}
          </div>
          {item.description && (
            <p className="text-xs text-gray-600 mt-2 leading-snug whitespace-pre-line">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {item.price_tier_1_price && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
            {item.price_tier_1_price && (
              <span>{item.price_tier_1_qty ? `1–${item.price_tier_2_qty ? item.price_tier_2_qty - 1 : item.price_tier_1_qty} ${unit}` : `Per ${unit}`}: <strong>₹{item.price_tier_1_price}</strong></span>
            )}
            {item.price_tier_2_qty && item.price_tier_2_price && (
              <span>{item.price_tier_2_qty}–{item.price_tier_3_qty ? item.price_tier_3_qty - 1 : '+'} {unit}: <strong>₹{item.price_tier_2_price}</strong></span>
            )}
            {item.price_tier_3_qty && item.price_tier_3_price && (
              <span>{item.price_tier_3_qty}+ {unit}: <strong>₹{item.price_tier_3_price}</strong></span>
            )}
          </div>
        </div>
      )}

      <div className="px-3 pb-3 pt-3 space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Quantity
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select how much you want to order
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
                  {hasPrice ? 'Price per unit' : 'Ask farmer for price'}
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
          className="flex items-center justify-center gap-2 w-full bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm active:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
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
          className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          Pay via UPI
        </button>

        {!upiId && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            UPI payment not available. Please order on WhatsApp.
          </p>
        )}

        {upiId && (
          <div className="space-y-2">
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

        {farmerInfo.farmerQrCodeUrl && (
          <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-3 text-sm font-bold text-gray-800">
              <span>Scan QR to pay</span>
              <span className="text-xs text-gray-400">Tap to view</span>
            </summary>
            <div className="px-3 pb-3 text-center">
              <img
                src={farmerInfo.farmerQrCodeUrl}
                alt={`UPI QR code for ${farmerInfo.farmerName}`}
                className="mx-auto w-44 max-w-full rounded-xl border border-gray-100 bg-white"
              />
            </div>
          </details>
        )}

        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm transition-colors ${
            added
              ? 'bg-green-100 text-green-800'
              : isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border border-green-200 bg-green-50 text-green-800 active:bg-green-100'
          }`}
        >
          {added ? (
            <>✓ Added to cart / బుట్టకు చేర్చబడింది</>
          ) : (
            <>
              <span className="text-lg leading-none">+</span>
              Add {selectedQty} to cart
            </>
          )}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-full border border-red-200 text-red-600 font-semibold py-2.5 rounded-xl text-sm active:bg-red-50"
          >
            🗑 Delete / తొలగించు
          </button>
        )}
      </div>
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

function ComingSoonCard({ item, farmerId, onDelete }: { item: Produce; farmerId: string; onDelete?: () => void }) {
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

      {onDelete && (
        <button
          onClick={onDelete}
          className="mt-3 w-full border border-red-200 text-red-600 font-semibold py-2.5 rounded-lg text-sm active:bg-red-50"
        >
          🗑 Delete / తొలగించు
        </button>
      )}
    </div>
  )
}
