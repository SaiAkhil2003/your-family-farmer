'use client'

import { useEffect, useState, useCallback } from 'react'

export type CartItem = {
  listingId: string
  qty: number
  name: string
  variety?: string
  emoji?: string
  pricePerKg?: number
  priceTier1Qty?: number
  priceTier1Price?: number
  priceTier2Qty?: number
  priceTier2Price?: number
  priceTier3Price?: number
  farmerId: string
  farmerName: string
  farmerPhone: string
  farmerVillage: string
  farmerSlug: string
  farmerPickupLocations?: string[]
}

export type CartState = Record<string, CartItem>

export type ConsumerInfo = { name: string; phone: string }

const CART_KEY = 'yff_cart_v1'
const CONSUMER_KEY = 'yff_consumer_v1'
const CART_EVENT = 'yff:cart-change'

const readCart = (): CartState => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartState) : {}
  } catch {
    return {}
  }
}

const writeCart = (next: CartState) => {
  localStorage.setItem(CART_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CART_EVENT))
}

function getActiveTier(qty: number, item: CartItem): { price?: number; isDiscount: boolean } {
  const { priceTier1Qty, priceTier1Price, priceTier2Qty, priceTier2Price, priceTier3Price } = item
  if (priceTier1Qty == null || priceTier1Price == null)
    return { price: item.pricePerKg, isDiscount: false }
  if (qty <= priceTier1Qty)
    return { price: priceTier1Price, isDiscount: false }
  if (priceTier2Qty != null && priceTier2Price != null) {
    if (qty <= priceTier2Qty) return { price: priceTier2Price, isDiscount: true }
    return { price: priceTier3Price ?? priceTier2Price, isDiscount: true }
  }
  if (priceTier3Price != null) return { price: priceTier3Price, isDiscount: true }
  return { price: priceTier1Price, isDiscount: false }
}

export function useCart() {
  const [cart, setCart] = useState<CartState>({})

  useEffect(() => {
    setCart(readCart())
    const sync = () => setCart(readCart())
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const addItem = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    const next = { ...readCart() }
    const existing = next[item.listingId]
    const newQty = Math.max(1, (existing?.qty ?? 0) + qty)
    const merged = { ...item, qty: newQty }
    const { price } = getActiveTier(newQty, merged)
    next[item.listingId] = { ...merged, pricePerKg: price ?? item.pricePerKg }
    writeCart(next)
  }, [])

  const setQty = useCallback((listingId: string, qty: number) => {
    const next = { ...readCart() }
    if (qty <= 0) delete next[listingId]
    else if (next[listingId]) {
      const updated = { ...next[listingId], qty }
      const { price } = getActiveTier(qty, updated)
      next[listingId] = { ...updated, pricePerKg: price ?? updated.pricePerKg }
    }
    writeCart(next)
  }, [])

  const removeItem = useCallback((listingId: string) => {
    const next = { ...readCart() }
    delete next[listingId]
    writeCart(next)
  }, [])

  const clear = useCallback(() => writeCart({}), [])

  const items = Object.values(cart)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return { cart, items, count, addItem, setQty, removeItem, clear }
}

export function useConsumerInfo() {
  const [info, setInfo] = useState<ConsumerInfo>({ name: '', phone: '' })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(CONSUMER_KEY)
      if (raw) setInfo(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const save = useCallback((next: ConsumerInfo) => {
    setInfo(next)
    localStorage.setItem(CONSUMER_KEY, JSON.stringify(next))
  }, [])

  return { info, save }
}

/* ─── Cart FAB + Sheet ───────────────────────────────── */
export function CartFab() {
  const { items, count } = useCart()
  const [open, setOpen] = useState(false)

  if (count === 0 && !open) return null

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-green-700 active:bg-green-800 text-white rounded-full shadow-2xl flex items-center gap-2 pl-4 pr-5 py-3.5"
          aria-label="View cart"
        >
          <CartIcon />
          <span className="font-extrabold text-sm">
            {count} {count === 1 ? 'item' : 'items'} / బుట్ట
          </span>
        </button>
      )}
      {open && (
        <CartSheet items={items} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

/* ─── Cart sheet ─────────────────────────────────────── */
function CartSheet({
  items,
  onClose,
}: {
  items: CartItem[]
  onClose: () => void
}) {
  const { setQty, removeItem, clear } = useCart()
  const { info, save: saveInfo } = useConsumerInfo()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sentFarmers, setSentFarmers] = useState<Record<string, boolean>>({})
  const [pickupByFarmer, setPickupByFarmer] = useState<Record<string, string>>({})

  useEffect(() => {
    setName(info.name)
    setPhone(info.phone)
  }, [info])

  // Group items by farmer
  const byFarmer = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.farmerId] = acc[item.farmerId] ?? []).push(item)
    return acc
  }, {})
  const farmerGroups = Object.values(byFarmer)

  const detailsMissing = !name.trim() || phone.replace(/\D/g, '').length < 10

  const handleOrderFarmer = (group: CartItem[]) => {
    if (detailsMissing) return
    saveInfo({ name: name.trim(), phone: phone.trim() })

    const f = group[0]
    const lines = group.map((it) => {
      const price = it.pricePerKg ? ` @ ₹${it.pricePerKg}/kg` : ''
      return `• ${it.emoji ?? '🌿'} ${it.name}${it.variety ? ` (${it.variety})` : ''} — ${it.qty} kg${price}`
    })

    const selectedPickup = pickupByFarmer[f.farmerId]
    const pickupLine = selectedPickup
      ? `\n\n*Pickup location / పికప్ స్థలం:* ${selectedPickup} (${f.farmerVillage})`
      : `\n\n*Pickup from your farm / మీ పొలం నుండి పికప్* (${f.farmerVillage})`

    const msg =
      `Hello ${f.farmerName} anna! 🙏\n` +
      `I saw your produce on YourFamilyFarmer and would like to order:\n\n` +
      lines.join('\n') +
      pickupLine +
      `\n\nMy name / నా పేరు: ${name.trim()}\n` +
      `My WhatsApp / నా వాట్సాప్: +91 ${phone.replace(/\D/g, '').slice(-10)}\n\n` +
      `Please share a good pickup time. Thank you! / పికప్ సమయం తెలియజేయండి, ధన్యవాదాలు 🌱`

    const digits = f.farmerPhone.replace(/\D/g, '').replace(/^0+/, '')
    const waPhone = digits.length === 10 ? `91${digits}` : digits
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`

    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setSentFarmers((s) => ({ ...s, [f.farmerId]: true }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 rounded-t-3xl">
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg">Your cart / మీ బుట్ట</h2>
            <p className="text-xs text-gray-500">
              Pickup from farm only / పొలం నుండి పికప్ మాత్రమే
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none p-1">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {items.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <div className="text-5xl mb-3">🛒</div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="text-sm mt-1">బుట్ట ఖాళీగా ఉంది</p>
            </div>
          ) : (
            <>
              {/* Consumer details */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Your name / మీ పేరు
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ramya"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Your WhatsApp number / వాట్సాప్ నంబర్
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  The farmer needs this to confirm pickup time.<br />
                  పికప్ సమయం కోసం రైతుకు ఇది అవసరం.
                </p>
              </div>

              {/* Farmer groups */}
              {farmerGroups.map((group) => {
                const f = group[0]
                const total = group.reduce(
                  (s, it) => s + (it.pricePerKg ?? 0) * it.qty,
                  0,
                )
                const sent = sentFarmers[f.farmerId]
                return (
                  <div
                    key={f.farmerId}
                    className="border border-gray-200 rounded-2xl overflow-hidden"
                  >
                    <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-extrabold text-green-900 truncate">
                          🧑‍🌾 {f.farmerName}
                        </p>
                        <p className="text-xs text-green-700">📍 {f.farmerVillage}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-green-700 text-white px-2 py-1 rounded-full whitespace-nowrap">
                        Pickup
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      {group.map((it) => (
                        <div key={it.listingId} className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                            {it.emoji ?? '🌿'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {it.name}
                            </p>
                            {it.pricePerKg && (
                              <p className="text-xs text-gray-500">₹{it.pricePerKg}/kg</p>
                            )}
                            {getActiveTier(it.qty, it).isDiscount && (
                              <p className="text-[10px] font-semibold text-green-700 mt-0.5">
                                Bulk price applied / బల్క్ ధర వర్తింపు
                              </p>
                            )}
                          </div>
                          <QtyStepper
                            qty={it.qty}
                            onDec={() => setQty(it.listingId, it.qty - 1)}
                            onInc={() => setQty(it.listingId, it.qty + 1)}
                          />
                          <button
                            onClick={() => removeItem(it.listingId)}
                            className="text-gray-300 text-xl px-1"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {total > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                          <span className="text-xs text-gray-500">Estimated total / మొత్తం</span>
                          <span className="font-extrabold text-gray-900">
                            ₹{total}
                          </span>
                        </div>
                      )}

                      {f.farmerPickupLocations && f.farmerPickupLocations.length > 0 && (
                        <div className="pt-2">
                          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block mb-1">
                            Pickup location / పికప్ స్థలం
                          </label>
                          <select
                            value={pickupByFarmer[f.farmerId] ?? ''}
                            onChange={(e) =>
                              setPickupByFarmer((prev) => ({
                                ...prev,
                                [f.farmerId]: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-green-500 focus:outline-none"
                          >
                            <option value="">Select a pickup point / స్థలం ఎంచుకోండి</option>
                            {f.farmerPickupLocations.map((loc) => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={() => handleOrderFarmer(group)}
                        disabled={detailsMissing}
                        className={`mt-1 w-full font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 ${
                          sent
                            ? 'bg-green-100 text-green-800'
                            : detailsMissing
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-green-700 text-white active:bg-green-800'
                        }`}
                      >
                        {sent ? (
                          <>✓ Order sent — tap to resend</>
                        ) : (
                          <>
                            <WhatsAppIcon />
                            Send to {f.farmerName.split(' ')[0] || 'farmer'} / వాట్సాప్
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}

              {farmerGroups.length > 1 && (
                <p className="text-xs text-gray-500 text-center px-4 leading-snug">
                  One WhatsApp chat opens per farmer, since each farm handles its own pickup.<br />
                  ప్రతి రైతుకు ప్రత్యేక వాట్సాప్ చాట్ తెరుచుకుంటుంది.
                </p>
              )}

              <button
                onClick={clear}
                className="w-full text-sm text-gray-500 underline pt-2"
              >
                Clear cart / బుట్ట ఖాళీ చేయండి
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function QtyStepper({
  qty,
  onDec,
  onInc,
}: {
  qty: number
  onDec: () => void
  onInc: () => void
}) {
  return (
    <div className="flex items-center border border-gray-200 rounded-full">
      <button
        onClick={onDec}
        className="w-8 h-8 text-lg text-gray-700 flex items-center justify-center active:bg-gray-100 rounded-l-full"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-10 text-center font-bold text-sm text-gray-900">
        {qty}
      </span>
      <button
        onClick={onInc}
        className="w-8 h-8 text-lg text-gray-700 flex items-center justify-center active:bg-gray-100 rounded-r-full"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
