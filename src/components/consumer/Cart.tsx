'use client'

import { useEffect, useState, useCallback } from 'react'
import { buildUpiPaymentUrl, buildWhatsAppUrl, resolveUpiPayeeName } from '@/lib/upi'
import { supabase } from '@/lib/supabase'

type PickupSlots = {
  days: string[]
  time_from: string
  time_to: string
}

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
  unit?: string
  stockQty?: number
  farmerId: string
  farmerName: string
  farmerPhone: string
  farmerVillage: string
  farmerSlug: string
  farmerPickupLocations?: string[]
  farmerPickupSlots?: PickupSlots | null
  farmerUpiId?: string
  farmerUpiName?: string
  farmerQrCodeUrl?: string
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

function formatCartItemLabel(item: Pick<CartItem, 'name' | 'variety'>) {
  return item.variety ? `${item.name} (${item.variety})` : item.name
}

function getGroupTotal(group: CartItem[]) {
  return Number(group.reduce((sum, item) => sum + (item.pricePerKg ?? 0) * item.qty, 0).toFixed(2))
}

function getUpiTransactionLabel(group: CartItem[], farmerName: string) {
  if (group.length === 1) return formatCartItemLabel(group[0])
  return farmerName.trim() || 'Multiple Items'
}

function formatDisplayAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

function buildCartPaymentConfirmationMessage(input: {
  farmerName: string
  buyerName: string
  buyerPhone: string
  items: Array<Pick<CartItem, 'name' | 'variety' | 'qty' | 'unit'>>
  totalAmount: number
  utrNumber?: string
}) {
  const farmerName = input.farmerName.trim() || 'Farmer'
  const buyerName = input.buyerName.trim() || 'Buyer'
  const buyerPhoneDigits = input.buyerPhone.replace(/\D/g, '').slice(-10)
  const buyerPhone = buyerPhoneDigits ? `+91 ${buyerPhoneDigits}` : input.buyerPhone.trim() || 'Not shared'
  const itemLines = input.items
    .map((item) => `- ${formatCartItemLabel(item)}: ${item.qty} ${item.unit || 'kg'}`)
    .join('\n')
  const utrLine = input.utrNumber?.trim() ? `UTR / Reference: ${input.utrNumber.trim()}\n` : ''

  return (
    `Hello ${farmerName} anna! I have paid for my YourFamilyFarmer order.\n\n` +
    `Order:\n` +
    `${itemLines}\n\n` +
    `Total paid: ₹${formatDisplayAmount(input.totalAmount)}\n` +
    `Payment method: UPI\n` +
    utrLine +
    `\nMy name: ${buyerName}\n` +
    `My phone: ${buyerPhone}\n\n` +
    `Please confirm my payment.`
  )
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
    const rawQty = Math.max(1, (existing?.qty ?? 0) + qty)
    const newQty = item.stockQty != null ? Math.min(rawQty, item.stockQty) : rawQty
    const merged = { ...item, qty: newQty }
    const { price } = getActiveTier(newQty, merged)
    next[item.listingId] = { ...merged, pricePerKg: price ?? item.pricePerKg }
    writeCart(next)
  }, [])

  const setQty = useCallback((listingId: string, qty: number) => {
    const next = { ...readCart() }
    if (qty <= 0) delete next[listingId]
    else if (next[listingId]) {
      const existing = next[listingId]
      const cappedQty = existing.stockQty != null ? Math.min(qty, existing.stockQty) : qty
      const updated = { ...existing, qty: cappedQty }
      const { price } = getActiveTier(cappedQty, updated)
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

  const clearFarmer = useCallback((farmerId: string) => {
    const next = { ...readCart() }
    for (const key of Object.keys(next)) {
      if (next[key].farmerId === farmerId) delete next[key]
    }
    writeCart(next)
  }, [])

  const items = Object.values(cart)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return { cart, items, count, addItem, setQty, removeItem, clear, clearFarmer }
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
          className="fixed bottom-6 right-4 z-40 bg-green-700 active:bg-green-800 text-white rounded-full shadow-2xl flex items-center gap-2 pl-4 pr-5 py-3.5"
          style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
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
  const { setQty, removeItem, clear, clearFarmer } = useCart()
  const { info, save: saveInfo } = useConsumerInfo()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupByFarmer, setPickupByFarmer] = useState<Record<string, string>>({})
  const [pickupDayByFarmer, setPickupDayByFarmer] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const [placingUpiOrder, setPlacingUpiOrder] = useState<string | null>(null)
  const [submittingResult, setSubmittingResult] = useState(false)
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  // Live UPI details fetched from DB — always up to date, overrides stale cart data
  const [liveUpiIds, setLiveUpiIds] = useState<Record<string, string>>({})
  const [liveUpiNames, setLiveUpiNames] = useState<Record<string, string>>({})
  const [liveQrUrls, setLiveQrUrls] = useState<Record<string, string>>({})
  const [showUpiAppFallback, setShowUpiAppFallback] = useState(false)
  const [utrNote, setUtrNote] = useState('')

  type UpiPaymentState = {
    farmerName: string
    farmerVillage: string
    farmerPhone: string | null
    upiId: string
    qrCodeUrl?: string
    amount: number
    orderIds: string[]
    farmerId: string
    items: Array<Pick<CartItem, 'name' | 'variety' | 'qty' | 'unit'>>
    paymentUrl: string
    transactionLabel: string
  }
  const [upiScreen, setUpiScreen] = useState<UpiPaymentState | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const toastBanner = toast ? (
    <div className="fixed top-5 left-0 right-0 flex justify-center z-[60] pointer-events-none px-4">
      <div className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl">
        {toast}
      </div>
    </div>
  ) : null

  // Fetch latest UPI details for all farmers in cart when sheet opens
  useEffect(() => {
    const farmerIds = [...new Set(items.map((i) => i.farmerId).filter(Boolean))]
    if (farmerIds.length === 0) return
    supabase
      .from('farmers')
      .select('id, upi_id, upi_name, upi_qr_code_url')
      .in('id', farmerIds)
      .then(({ data }) => {
        if (!data) return
        const upiMap: Record<string, string> = {}
        const upiNameMap: Record<string, string> = {}
        const qrMap: Record<string, string> = {}
        for (const f of data) {
          if (f.upi_id) upiMap[f.id] = f.upi_id
          if (f.upi_name) upiNameMap[f.id] = f.upi_name
          if (f.upi_qr_code_url) qrMap[f.id] = f.upi_qr_code_url
        }
        setLiveUpiIds(upiMap)
        setLiveUpiNames(upiNameMap)
        setLiveQrUrls(qrMap)
      })
  }, [items])

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

  // COD/WhatsApp fallback: save order + open WhatsApp
  const handleCodOrderFarmer = (group: CartItem[], mode: 'cash' | 'whatsapp' = 'cash') => {
    if (detailsMissing) return
    saveInfo({ name: name.trim(), phone: phone.trim() })

    const f = group[0]
    const lines = group.map((it) => {
      const unit = it.unit || 'kg'
      const price = it.pricePerKg ? ` @ ₹${it.pricePerKg}/${unit}` : ''
      return `• ${it.emoji ?? '🌿'} ${it.name}${it.variety ? ` (${it.variety})` : ''} — ${it.qty} ${unit}${price}`
    })

    const selectedPickup = pickupByFarmer[f.farmerId]
    const selectedDay    = pickupDayByFarmer[f.farmerId]
    const pickupLine = selectedPickup
      ? `\n\n*Pickup location / పికప్ స్థలం:* ${selectedPickup} (${f.farmerVillage})`
      : `\n\n*Pickup from your farm / మీ పొలం నుండి పికప్* (${f.farmerVillage})`
    const dayLine = selectedDay ? `\n*Pickup day / రోజు:* ${selectedDay}` : ''
    const paymentLine = mode === 'whatsapp'
      ? `\n\n*Payment:* UPI is not available. Please confirm the payment option on WhatsApp.`
      : `\n\n*Payment: Cash on Pickup / చెల్లింపు: నగదు పికప్ సమయంలో*`
    const closingLine = mode === 'whatsapp'
      ? 'Please confirm payment details and pickup time. Thank you! / చెల్లింపు విధానం మరియు పికప్ సమయం తెలియజేయండి, ధన్యవాదాలు 🌱'
      : 'Please share a good pickup time. Thank you! / పికప్ సమయం తెలియజేయండి, ధన్యవాదాలు 🌱'

    const msg =
      `Hello ${f.farmerName} anna! 🙏\n` +
      `I saw your produce on YourFamilyFarmer and would like to order:\n\n` +
      lines.join('\n') +
      pickupLine +
      dayLine +
      paymentLine +
      `\n\n` +
      `My name / నా పేరు: ${name.trim()}\n` +
      `My WhatsApp / నా వాట్సాప్: +91 ${phone.replace(/\D/g, '').slice(-10)}\n\n` +
      closingLine

    const waUrl = buildWhatsAppUrl(f.farmerPhone, msg)

    const buyerPhone = phone.replace(/\D/g, '').slice(-10)
    for (const it of group) {
      const baseRow = {
        farmer_id: it.farmerId,
        produce_listing_id: it.listingId,
        produce_name: it.name,
        quantity: it.qty,
        unit: it.unit || 'kg',
        total_price: it.pricePerKg ? Math.round(it.pricePerKg * it.qty) : null,
        buyer_name: name.trim(),
        buyer_phone: buyerPhone,
        pickup_location: selectedPickup || null,
        status: 'pending',
      }
      supabase.from('orders').insert({ ...baseRow, payment_method: 'cod', payment_status: 'pending' })
        .then(async ({ error }) => {
          if (error?.message?.includes('payment_method') || error?.message?.includes('payment_status')) {
            const { error: err2 } = await supabase.from('orders').insert(baseRow)
            if (err2) console.error('[YFF] Order save failed:', err2.message)
          } else if (error) {
            console.error('[YFF] Order save failed:', error.message, error.details, error.hint)
          }
        })
    }

    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    } else {
      showToast('Farmer WhatsApp is not available right now.')
    }
    clearFarmer(f.farmerId)
    supabase.from('wa_clicks').insert({ farmer_id: f.farmerId }).then()
  }

  // UPI flow: save orders, collect IDs, show payment screen
  const handleUpiOrderFarmer = async (group: CartItem[]) => {
    if (detailsMissing) return
    const f = group[0]
    const upiId = (liveUpiIds[f.farmerId] ?? f.farmerUpiId ?? '').trim()
    const qrCodeUrl = liveQrUrls[f.farmerId] ?? f.farmerQrCodeUrl
    if (!upiId) return

    const total = getGroupTotal(group)
    const transactionLabel = getUpiTransactionLabel(group, f.farmerName)
    const paymentUrl = buildUpiPaymentUrl({
      upiId,
      payeeName: resolveUpiPayeeName(liveUpiNames[f.farmerId] ?? f.farmerUpiName, f.farmerName),
      amount: total,
      produceName: transactionLabel,
      quantity: group.length === 1 ? group[0].qty : group.reduce((sum, item) => sum + item.qty, 0),
      unit: group.length === 1 ? group[0].unit || 'kg' : 'items',
    })
    if (!paymentUrl) {
      showToast('UPI payment is not available for this order right now.')
      return
    }

    setUtrNote('')
    setShowUpiAppFallback(false)
    setPaymentSubmitted(false)
    saveInfo({ name: name.trim(), phone: phone.trim() })
    setPlacingUpiOrder(f.farmerId)

    const selectedPickup = pickupByFarmer[f.farmerId] || null
    const buyerPhone = phone.replace(/\D/g, '').slice(-10)
    const orderIds: string[] = []

    for (const it of group) {
      const price = it.pricePerKg ? Math.round(it.pricePerKg * it.qty) : null
      const { data, error } = await supabase.from('orders').insert({
        farmer_id: it.farmerId,
        produce_listing_id: it.listingId,
        produce_name: it.name,
        quantity: it.qty,
        unit: it.unit || 'kg',
        total_price: price,
        buyer_name: name.trim(),
        buyer_phone: buyerPhone,
        pickup_location: selectedPickup,
        status: 'pending',
        payment_method: 'upi',
        payment_status: 'pending',
      }).select('id').single()

      if (!error && data) orderIds.push(data.id)
      else if (error) console.error('[YFF] UPI order save failed:', error.message)
    }

    setPlacingUpiOrder(null)
    if (orderIds.length === 0) {
      showToast('Could not place order. Please try again.')
      return
    }

    setUpiScreen({
      farmerName: f.farmerName,
      farmerVillage: f.farmerVillage,
      farmerPhone: f.farmerPhone,
      upiId,
      qrCodeUrl,
      amount: total,
      orderIds,
      farmerId: f.farmerId,
      items: group.map((item) => ({
        name: item.name,
        variety: item.variety,
        qty: item.qty,
        unit: item.unit || 'kg',
      })),
      paymentUrl,
      transactionLabel,
    })
  }

  const handlePaymentSubmitted = async () => {
    if (!upiScreen) return
    setSubmittingResult(true)
    const updateData: Record<string, unknown> = { payment_status: 'pending_confirmation' }
    if (utrNote.trim()) updateData.utr_number = utrNote.trim()
    await Promise.all(
      upiScreen.orderIds.map((id) =>
        supabase.from('orders').update(updateData).eq('id', id)
      )
    )
    clearFarmer(upiScreen.farmerId)
    setSubmittingResult(false)
    setPaymentSubmitted(true)
  }

  const handleOpenUpiApp = () => {
    if (!upiScreen?.paymentUrl) return
    setShowUpiAppFallback(false)
    window.location.href = upiScreen.paymentUrl
    const t = setTimeout(() => setShowUpiAppFallback(true), 2500)
    const cleanup = () => { clearTimeout(t); setShowUpiAppFallback(false) }
    window.addEventListener('blur', cleanup, { once: true })
  }

  const paymentProofWhatsappUrl = upiScreen && paymentSubmitted
    ? buildWhatsAppUrl(
        upiScreen.farmerPhone,
        buildCartPaymentConfirmationMessage({
          farmerName: upiScreen.farmerName,
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          items: upiScreen.items,
          totalAmount: upiScreen.amount,
          utrNumber: utrNote.trim(),
        })
      )
    : null

  // Submission screen — shown after buyer says payment is done
  if (upiScreen && paymentSubmitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
        {toastBanner}
        <div className="bg-white w-full max-w-md rounded-t-3xl px-6 py-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-3xl">
            ⏳
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-xl">
              Payment submitted for farmer confirmation
            </h2>
            <p className="font-semibold mt-0.5 text-blue-700">
              Waiting for farmer verification
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl px-5 py-4 w-full text-left space-y-1">
            <p className="text-xs text-gray-500 font-medium">Paid to</p>
            <p className="font-bold text-gray-900">{upiScreen.farmerName}</p>
            <p className="text-xs text-gray-500">{upiScreen.farmerVillage}</p>
            <p className="text-lg font-black text-green-900 mt-2">₹{formatDisplayAmount(upiScreen.amount)}</p>
            {utrNote.trim() && (
              <p className="text-xs text-gray-600 pt-1">
                UTR / Reference: <span className="font-mono font-semibold text-gray-900">{utrNote.trim()}</span>
              </p>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 w-full text-left space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              Please send your payment screenshot or UTR on WhatsApp to the farmer for confirmation.
            </p>
            <p className="text-xs text-amber-800 leading-snug">
              The farmer will verify the payment from their UPI app before marking the order as paid.
            </p>
          </div>
          {paymentProofWhatsappUrl ? (
            <a
              href={paymentProofWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-700 text-white font-bold py-4 rounded-xl text-base active:bg-green-800 flex items-center justify-center gap-2"
            >
              <WhatsAppIcon />
              Send Screenshot / UTR on WhatsApp
            </a>
          ) : (
            <p className="text-xs text-gray-500 leading-snug">
              Farmer WhatsApp is not available here. Please share your screenshot or UTR manually.
            </p>
          )}
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-800 font-bold py-4 rounded-xl text-base active:bg-gray-50"
          >
            Done / మూసివేయి
          </button>
        </div>
      </div>
    )
  }

  // Payment screen shown after placing an order
  if (upiScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
        {toastBanner}
        <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[92vh] flex flex-col">
          <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 rounded-t-3xl">
            <div>
              <h2 className="font-extrabold text-gray-900 text-lg">Pay Farmer / రైతుకు చెల్లించండి</h2>
              <p className="text-xs text-gray-500">Pay directly to farmer using UPI</p>
            </div>
            <button onClick={onClose} className="text-gray-400 text-3xl leading-none p-1">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {/* Amount + farmer */}
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-green-700">🧑‍🌾 {upiScreen.farmerName}</p>
              <p className="text-xs text-green-600 mt-0.5">{upiScreen.farmerVillage}</p>
              <p className="text-4xl font-black text-green-900 mt-3">₹{formatDisplayAmount(upiScreen.amount)}</p>
              <p className="text-sm text-green-700 mt-1">Total amount to pay</p>
            </div>

            {/* QR code (if available) */}
            {upiScreen.qrCodeUrl && (
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Scan QR to pay</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upiScreen.qrCodeUrl} alt="UPI QR Code" className="w-40 h-40 object-contain rounded-xl" />
                <p className="text-[11px] text-gray-500 text-center">Open any UPI app → Scan QR / QR స్కాన్ చేయండి</p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-500 mb-0.5">UPI ID</p>
                <p className="font-mono text-sm font-semibold text-gray-900 break-all">{upiScreen.upiId}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  If copy does not work, use the UPI ID shown above manually.
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
                    await navigator.clipboard.writeText(upiScreen.upiId)
                    showToast('UPI ID copied')
                  } catch {
                    showToast('Copy failed. Please copy the UPI ID manually.')
                  }
                }}
                className="flex-shrink-0 bg-gray-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs active:bg-gray-900"
              >
                Copy
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Transaction note</p>
              <p className="text-sm font-semibold text-blue-900 mt-1">
                YourFamilyFarmer Order - {upiScreen.transactionLabel}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleOpenUpiApp}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-base active:bg-blue-700 flex items-center justify-center gap-2"
              >
                📲 Pay via UPI / UPI ద్వారా చెల్లించండి
              </button>
              {showUpiAppFallback && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800 text-center">App did not open automatically.</p>
                  <p className="text-xs text-amber-700 text-center mt-1">
                    Please copy the UPI ID and pay manually using PhonePe, Google Pay, Paytm, or BHIM.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <p className="text-sm font-semibold text-amber-800">
                After paying, tap “I Have Paid” below. The payment will stay pending farmer confirmation until the farmer verifies it.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">
                UTR / Reference (optional) / యూటీఆర్
              </label>
              <input
                type="text"
                inputMode="text"
                placeholder="e.g. GPay ref 123456"
                value={utrNote}
                onChange={(e) => setUtrNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handlePaymentSubmitted}
              disabled={submittingResult}
              className="w-full bg-green-700 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:bg-green-800"
            >
              {submittingResult ? 'Saving...' : 'I Have Paid - Submit for Confirmation'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      {toastBanner}
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

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                  Payment / చెల్లింపు
                </p>
                <p className="text-sm font-bold text-blue-900">
                  Pay directly to farmer using UPI.
                </p>
                <p className="text-xs text-blue-700 leading-snug">
                  Place the order, pay via UPI, then send your screenshot or UTR on WhatsApp for farmer confirmation.
                </p>
                <p className="text-[11px] text-blue-800 bg-white/70 border border-blue-100 rounded-xl px-3 py-2 leading-snug">
                  Cash on pickup is kept only as a small fallback below each farmer card.
                </p>
              </div>

              {/* Farmer groups */}
              {farmerGroups.map((group) => {
                const f = group[0]
                const total = getGroupTotal(group)
                const hasUpi = Boolean((liveUpiIds[f.farmerId] ?? f.farmerUpiId)?.trim())
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
                              <p className="text-xs text-gray-500">₹{it.pricePerKg}/{it.unit || 'kg'}</p>
                            )}
                            {getActiveTier(it.qty, it).isDiscount && (
                              <p className="text-[10px] font-semibold text-green-700 mt-0.5">
                                Bulk price applied / బల్క్ ధర వర్తింపు
                              </p>
                            )}
                          </div>
                          <QtyStepper
                            qty={it.qty}
                            maxQty={it.stockQty}
                            onDec={() => setQty(it.listingId, it.qty - 1)}
                            onInc={() => {
                              if (it.stockQty != null && it.qty >= it.stockQty) {
                                showToast('No more stock available / స్టాక్ అయిపోయింది')
                                return
                              }
                              setQty(it.listingId, it.qty + 1)
                            }}
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
                            ₹{formatDisplayAmount(total)}
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

                      {f.farmerPickupSlots && f.farmerPickupSlots.days.length > 0 && (
                        <div className="pt-2">
                          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block mb-1">
                            Pickup day / పికప్ రోజు
                          </label>
                          <p className="text-[11px] text-green-700 font-medium mb-1.5">
                            Available {f.farmerPickupSlots.time_from}–{f.farmerPickupSlots.time_to}
                          </p>
                          <select
                            value={pickupDayByFarmer[f.farmerId] ?? ''}
                            onChange={(e) =>
                              setPickupDayByFarmer((prev) => ({
                                ...prev,
                                [f.farmerId]: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-green-500 focus:outline-none"
                          >
                            <option value="">Select a day / రోజు ఎంచుకోండి</option>
                            {f.farmerPickupSlots.days.map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {hasUpi ? (
                        <div className="pt-2 space-y-2">
                          <button
                            onClick={() => handleUpiOrderFarmer(group)}
                            disabled={detailsMissing || placingUpiOrder === f.farmerId}
                            className={`mt-1 w-full font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 ${
                              detailsMissing
                                ? 'bg-gray-200 text-gray-500'
                                : 'bg-blue-600 text-white active:bg-blue-700 disabled:opacity-50'
                            }`}
                          >
                            {placingUpiOrder === f.farmerId
                              ? 'Placing order...'
                              : `📲 Pay via UPI ₹${formatDisplayAmount(total)}`}
                          </button>
                          <p className="text-[11px] text-blue-700 text-center px-2">
                            Pay directly to {f.farmerName.split(' ')[0] || 'the farmer'} using UPI.
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 space-y-2">
                          <button
                            disabled
                            className="mt-1 w-full font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 bg-gray-200 text-gray-500"
                          >
                            📲 Pay via UPI unavailable
                          </button>
                          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center leading-snug">
                            UPI payment is not available for this farmer. Please order on WhatsApp.
                          </p>
                        </div>
                      )}

                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                          Fallback
                        </p>
                        <p className="text-xs text-gray-600 leading-snug">
                          {hasUpi
                            ? 'Need cash on pickup instead? Use WhatsApp as the fallback option for this farmer.'
                            : 'Use WhatsApp to place the order and confirm payment details with the farmer.'}
                        </p>
                        <button
                          onClick={() => handleCodOrderFarmer(group, hasUpi ? 'cash' : 'whatsapp')}
                          disabled={detailsMissing}
                          className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border ${
                            detailsMissing
                              ? 'border-gray-200 bg-gray-100 text-gray-400'
                              : 'border-gray-300 bg-white text-gray-700 active:bg-gray-50'
                          }`}
                        >
                          <WhatsAppIcon />
                          {hasUpi ? 'Order on WhatsApp instead' : 'Order on WhatsApp'}
                        </button>
                      </div>
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
  maxQty,
}: {
  qty: number
  onDec: () => void
  onInc: () => void
  maxQty?: number
}) {
  const atMax = maxQty != null && qty >= maxQty
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
        disabled={atMax}
        className={`w-8 h-8 text-lg flex items-center justify-center rounded-r-full ${
          atMax
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-700 active:bg-gray-100'
        }`}
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
