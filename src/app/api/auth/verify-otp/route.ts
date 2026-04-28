import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rawPhone: string = body.phone ?? ''
  const otp: string = String(body.otp ?? '').trim()
  const digits = rawPhone.replace(/\D/g, '').slice(-10)

  if (digits.length !== 10 || !otp) {
    return NextResponse.json({ error: 'Phone and OTP are required.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up a valid (unused, not expired) OTP for this phone
  const { data: record } = await supabase
    .from('farmer_otps')
    .select('id')
    .eq('phone', digits)
    .eq('otp', otp)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!record) {
    return NextResponse.json(
      { error: 'Invalid or expired OTP. Please try again.' },
      { status: 401 },
    )
  }

  // Mark OTP as used immediately so it can't be reused
  await supabase.from('farmer_otps').update({ used: true }).eq('id', record.id)

  // Look up farmer by any common phone format stored in DB
  const { data: farmers } = await supabase
    .from('farmers')
    .select('id, name, slug, phone')
    .or(
      [
        `phone.eq.${digits}`,
        `phone.eq.0${digits}`,
        `phone.eq.+91${digits}`,
        `phone.eq.91${digits}`,
      ].join(','),
    )
    .limit(1)

  let farmer = farmers?.[0]

  if (farmer) {
    // Make sure existing farmer is active
    await supabase.from('farmers').update({ active: true }).eq('id', farmer.id)
  } else {
    // Auto-create a minimal farmer record on first login
    const rand = Math.random().toString(36).slice(2, 6)
    const slug = `f-${digits}-${rand}`
    const { data: created, error: insertErr } = await supabase
      .from('farmers')
      .insert({
        phone: digits,
        slug,
        name: '',
        village: '',
        district: '',
        method: 'natural',
        region_slug: 'tadepalligudem',
        active: true,
      })
      .select('id, name, slug, phone')
      .single()

    if (insertErr || !created) {
      return NextResponse.json({ error: 'Could not create farmer profile.' }, { status: 500 })
    }
    farmer = created
  }

  return NextResponse.json({ ok: true, farmerId: farmer.id, farmerSlug: farmer.slug })
}
