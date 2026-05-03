'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { useCart } from '@/components/consumer/Cart'
import {
  buildUpiPaymentUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  resolveUpiPayeeName,
} from '@/lib/upi'

type ProduceItem = {
  id: string
  name: string
  variety?: string
  emoji?: string
  farmer_id: string
  price_tier_1_price?: number
  price_tier_1_qty?: number
  price_tier_2_price?: number
  price_tier_2_qty?: number
  price_tier_3_price?: number
  unit?: string
  stock_qty?: number
  method?: string
}

type Farmer = {
  id: string
  slug: string
  name: string
  village?: string
  phone?: string
  pickup_locations?: string[]
  rating_avg?: number
  upi_id?: string | null
  upi_name?: string | null
  upi_qr_code_url?: string | null
}

export default function BrowseProduceTab({
  produce,
  farmers,
}: {
  produce: Record<string, unknown>[]
  farmers: Record<string, unknown>[]
}) {
  const { tx } = useLang()
  const { addItem, cart } = useCart()
  const [search, setSearch] = useState('')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const list = produce as ProduceItem[]
  const farmerList = farmers as Farmer[]

  const getFarmer = (farmerId: string) => farmerList.find((f) => f.id === farmerId)

  const filtered = list.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.variety ?? '').toLowerCase().includes(q)
    )
  })

  const handleAddToCart = (item: ProduceItem, qty = 1) => {
    const farmer = getFarmer(item.farmer_id)
    if (!farmer?.phone) return

    addItem({
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
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerVillage: farmer.village ?? '',
      farmerSlug: farmer.slug,
      farmerPickupLocations: farmer.pickup_locations,
      farmerUpiId: farmer.upi_id ?? undefined,
      farmerUpiName: farmer.upi_name ?? farmer.name,
      farmerQrCodeUrl: farmer.upi_qr_code_url ?? undefined,
    }, qty)

    setAddedIds((prev) => new Set(prev).add(item.id))
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }, 2000)
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">{tx.noProduceFound}</div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tx.searchProducePlaceholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none bg-white"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">{tx.noProduceFound}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((item) => {
            const farmer = getFarmer(item.farmer_id)
            if (!farmer) return null
            const added = addedIds.has(item.id)
            const inCart = cart[item.id]

            return (
              <ProduceCard
                key={item.id}
                item={item}
                farmer={farmer}
                inCartQty={inCart?.qty ?? 0}
                added={added}
                onAddToCart={(qty) => handleAddToCart(item, qty)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function getUnitPrice(item: ProduceItem, qty: number) {
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
  farmer,
  inCartQty,
  added,
  onAddToCart,
}: {
  item: ProduceItem
  farmer: Farmer
  inCartQty: number
  added: boolean
  onAddToCart: (qty: number) => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const unit = item.unit ?? 'kg'
  const maxQty = item.stock_qty != null && item.stock_qty > 0 ? item.stock_qty : null
  const isOutOfStock = item.stock_qty != null && item.stock_qty <= 0
  const selectedQty = clampQuantity(quantity, maxQty)
  const selectedUnitPrice = getUnitPrice(item, selectedQty)
  const totalAmount = selectedUnitPrice != null ? Number((selectedUnitPrice * selectedQty).toFixed(2)) : 0
  const upiId = farmer.upi_id ?? ''
  const payeeName = resolveUpiPayeeName(farmer.upi_name, farmer.name)
  const whatsappMessage = buildWhatsAppOrderMessage({
    farmerName: farmer.name,
    farmerPhone: farmer.phone ?? '',
    produceName: item.name,
    variety: item.variety,
    quantity: selectedQty,
    unit,
    totalAmount,
    upiId,
  })
  const whatsappUrl = buildWhatsAppUrl(farmer.phone ?? '', whatsappMessage)
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
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Link href={`/farmer/${farmer.slug}#produce`} className="block p-3">
        <div className="text-3xl mb-2">{item.emoji ?? '🌿'}</div>
        <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.name}</h3>
        {item.variety && (
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{item.variety}</p>
        )}
        <p className="text-xs text-green-700 font-semibold mt-1 truncate">
          {farmer.name}
          {farmer.village ? ` · ${farmer.village}` : ''}
        </p>
        {farmer.rating_avg ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-500">{farmer.rating_avg.toFixed(1)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between mt-2">
          {item.price_tier_1_price ? (
            <span className="text-sm font-bold text-gray-900">
              ₹{item.price_tier_1_price}
              <span className="text-xs font-normal text-gray-400">/{unit}</span>
            </span>
          ) : (
            <span />
          )}
          {item.method === 'natural' && (
            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Natural
            </span>
          )}
        </div>
        {item.stock_qty !== undefined && item.stock_qty > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">
            {item.stock_qty} {unit} left
          </p>
        )}
      </Link>

      <div className="px-3 pb-3 space-y-2">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
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
          className="flex items-center justify-center gap-2 w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm active:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
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
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
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

        {farmer.upi_qr_code_url && (
          <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
          onClick={() => onAddToCart(selectedQty)}
          disabled={isOutOfStock || !item.price_tier_1_price || !farmer.phone}
          className={`flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm transition-colors ${
            added
              ? 'bg-green-100 text-green-800'
              : isOutOfStock || !item.price_tier_1_price || !farmer.phone
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border border-green-200 bg-green-50 text-green-800 active:bg-green-100'
          }`}
        >
          {added ? (
            <>✓ Added to cart</>
          ) : (
            <>
              <span className="text-lg leading-none">+</span>
              {inCartQty > 0 ? `Add ${selectedQty} more to cart` : `Add ${selectedQty} to cart`}
            </>
          )}
        </button>

        {inCartQty > 0 && (
          <p className="text-xs text-green-700 font-semibold text-center">
            In cart: {inCartQty} {unit}
          </p>
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
