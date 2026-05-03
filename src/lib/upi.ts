export type BuildUpiPaymentUrlInput = {
  upiId: string | null | undefined
  payeeName: string | null | undefined
  amount: number | string
  produceName: string
  variety?: string | null
  quantity: number | string
  unit: string | null | undefined
}

export type BuildWhatsAppOrderMessageInput = {
  farmerName: string
  farmerPhone: string
  produceName: string
  variety?: string | null
  quantity: number | string
  unit: string | null | undefined
  totalAmount: number | string
  upiId: string | null | undefined
}

const normalizeText = (value: string | null | undefined) => value?.trim() ?? ''

const formatAmount = (amount: number | string) => {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null
  return numericAmount.toFixed(2)
}

const formatDisplayAmount = (amount: number | string) => {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null
  return Number.isInteger(numericAmount) ? String(numericAmount) : numericAmount.toFixed(2)
}

const encodeParam = (value: string) => encodeURIComponent(value)

export const resolveUpiPayeeName = (
  upiName: string | null | undefined,
  farmerName: string | null | undefined,
) => normalizeText(upiName) || normalizeText(farmerName)

export function buildUpiPaymentUrl(input: BuildUpiPaymentUrlInput) {
  const upiId = normalizeText(input.upiId)
  if (!upiId) return null

  const payeeName = normalizeText(input.payeeName)
  const amount = formatAmount(input.amount)
  const produceName = normalizeText(input.produceName)

  if (!payeeName || !amount || !produceName) return null

  const note = `YourFamilyFarmer Order - ${produceName}`

  return (
    `upi://pay?pa=${encodeParam(upiId)}` +
    `&pn=${encodeParam(payeeName)}` +
    `&am=${amount}` +
    `&cu=INR` +
    `&tn=${encodeParam(note)}`
  )
}

export function buildWhatsAppOrderMessage(input: BuildWhatsAppOrderMessageInput) {
  const farmerName = normalizeText(input.farmerName)
  const produceName = normalizeText(input.produceName)
  const variety = normalizeText(input.variety)
  const quantity = String(input.quantity).trim() || '1'
  const unit = normalizeText(input.unit) || 'kg'
  const totalAmount = formatDisplayAmount(input.totalAmount) ?? '0'
  const upiId = normalizeText(input.upiId) || 'Not available yet'
  const produceLabel = variety ? `${produceName} (${variety})` : produceName

  return (
    `Hello ${farmerName} anna! I found your profile on YourFamilyFarmer.\n\n` +
    `I would like to order:\n` +
    `- ${produceLabel}: ${quantity} ${unit}\n` +
    `Total amount: ₹${totalAmount}\n\n` +
    `I will pay using UPI.\n` +
    `UPI ID: ${upiId}\n\n` +
    `My name: [buyer fills in]\n` +
    `Delivery / pickup preference: [buyer fills in]\n` +
    `My location: [buyer fills in]\n\n` +
    `After payment, I will send the screenshot here for confirmation.`
  )
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const digits = normalizeText(phone).replace(/\D/g, '').replace(/^0+/, '')
  const text = message.trim()
  if (!digits || !text) return null

  const waPhone = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
}
