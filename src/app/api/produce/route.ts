import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'available'

  const { data: produce, error } = await supabase
    .from('produce_listings')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!produce?.length) return NextResponse.json([])

  const farmerIds = [...new Set(produce.map((p) => p.farmer_id))]

  const { data: farmers } = await supabase
    .from('farmers')
    .select('id, name, village, slug, phone, method, region_slug, pickup_locations, pickup_slots, lat, lng, upi_id, upi_name, upi_qr_code_url')
    .in('id', farmerIds)
    .eq('active', true)

  const farmerMap = Object.fromEntries((farmers ?? []).map((f) => [f.id, f]))

  const result = produce
    .map((p) => ({ ...p, farmer: farmerMap[p.farmer_id] ?? null }))
    .filter((p) => p.farmer !== null)

  return NextResponse.json(result)
}
