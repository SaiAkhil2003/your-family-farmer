import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Create admin client inside handler so missing env var doesn't crash the build
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { listingId, farmerId, payload } = body

  if (!listingId || !farmerId || !payload) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify this listing belongs to the farmer before updating
  const { data: existing } = await supabaseAdmin
    .from('produce_listings')
    .select('id')
    .eq('id', listingId)
    .eq('farmer_id', farmerId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Listing not found or access denied' }, { status: 403 })
  }

  const { data: updated, error } = await supabaseAdmin
    .from('produce_listings')
    .update(payload)
    .eq('id', listingId)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Update failed — no rows changed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
