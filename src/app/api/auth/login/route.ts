import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const hashBuffer = Buffer.from(hash, 'hex')
    const derived = scryptSync(password, salt, 64)
    return timingSafeEqual(hashBuffer, derived)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rawPhone: string = body.phone ?? ''
  const password: string = String(body.password ?? '').trim()
  const digits = rawPhone.replace(/\D/g, '').slice(-10)

  if (digits.length !== 10) {
    return NextResponse.json({ error: 'Enter a valid 10-digit phone number.' }, { status: 400 })
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up farmer by phone (any stored format)
  const { data: farmers } = await supabase
    .from('farmers')
    .select('id, name, slug, phone, password_hash')
    .or(
      [
        `phone.eq.${digits}`,
        `phone.eq.0${digits}`,
        `phone.eq.+91${digits}`,
        `phone.eq.91${digits}`,
      ].join(','),
    )
    .limit(1)

  const farmer = farmers?.[0]

  if (farmer) {
    if (!farmer.password_hash) {
      // Existing farmer logging in for first time after migration — set their password
      const hash = hashPassword(password)
      await supabase.from('farmers').update({ password_hash: hash, active: true }).eq('id', farmer.id)
      return NextResponse.json({ ok: true, farmerId: farmer.id, farmerSlug: farmer.slug })
    }

    if (!verifyPassword(password, farmer.password_hash)) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    await supabase.from('farmers').update({ active: true }).eq('id', farmer.id)
    return NextResponse.json({ ok: true, farmerId: farmer.id, farmerSlug: farmer.slug })
  }

  // New farmer — create account with this password
  const rand = Math.random().toString(36).slice(2, 6)
  const slug = `f-${digits}-${rand}`
  const hash = hashPassword(password)

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
      password_hash: hash,
    })
    .select('id, name, slug')
    .single()

  if (insertErr || !created) {
    return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, farmerId: created.id, farmerSlug: created.slug })
}
