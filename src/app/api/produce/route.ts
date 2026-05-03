import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'available'
  const isDev = process.env.NODE_ENV !== 'production'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const db =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabase

  const { data: produce, error } = await db
    .from('produce_listings')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/produce] produce query failed', { message: error.message, status })
    return NextResponse.json({ error: error.message, stage: 'produce_lookup' }, { status: 500 })
  }
  if (!produce?.length) return NextResponse.json([])

  const farmerIds = [...new Set(produce.map((p) => p.farmer_id).filter(Boolean))]

  if (!farmerIds.length) {
    const payload = {
      error: 'Produce rows were found but no farmer IDs were present.',
      stage: 'farmer_ids',
      produceCount: produce.length,
    }
    if (isDev) {
      console.error('[api/produce] produce rows missing farmer IDs', payload)
      return NextResponse.json(payload, { status: 500 })
    }
    return NextResponse.json({ error: payload.error, stage: payload.stage }, { status: 500 })
  }

  const { data: farmers, error: farmersError } = await db
    .from('farmers')
    .select('id, name, village, slug, phone, method, region_slug, pickup_locations, pickup_slots, lat, lng, upi_id, upi_name, upi_qr_code_url, active')
    .in('id', farmerIds)
    .eq('active', true)

  if (farmersError) {
    console.error('[api/produce] farmers query failed', {
      message: farmersError.message,
      status,
      farmerIds,
    })
    return NextResponse.json({ error: farmersError.message, stage: 'farmers_lookup' }, { status: 500 })
  }

  const farmerMap = Object.fromEntries((farmers ?? []).map((f) => [f.id, f]))

  const result = produce
    .map((p) => ({ ...p, farmer: farmerMap[p.farmer_id] ?? null }))
    .filter((p) => p.farmer !== null)

  if (!result.length) {
    const payload = {
      error: 'Produce rows were found, but no active farmers matched them.',
      stage: 'farmer_match',
      produceCount: produce.length,
      farmerIds,
      activeFarmerCount: farmers?.length ?? 0,
    }
    console.error('[api/produce] no active farmer matches for produce', payload)
    if (isDev) {
      return NextResponse.json(payload, { status: 500 })
    }
    return NextResponse.json({ error: payload.error, stage: payload.stage }, { status: 500 })
  }

  return NextResponse.json(result)
}
