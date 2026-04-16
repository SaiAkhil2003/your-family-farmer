import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import RegionTopBar from '@/components/region/RegionTopBar'
import RegionHero from '@/components/region/RegionHero'
import RegionContent from '@/components/region/RegionContent'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: region } = await supabase
    .from('regions')
    .select('name, district')
    .eq('slug', slug)
    .single()

  if (!region) return { title: 'Region not found' }

  return {
    title: `Natural Farmers in ${region.name} — YourFamilyFarmer`,
    description: `Find natural farmers near ${region.name}, ${region.district}. Buy fresh produce directly with no middlemen.`,
  }
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!region) notFound()

  const { data: farmers } = await supabase
    .from('farmers')
    .select('*')
    .eq('region_slug', slug)
    .eq('active', true)
    .order('created_at', { ascending: true })

  const farmerIds = (farmers ?? []).map((f) => f.id)

  const { data: produce } = farmerIds.length
    ? await supabase
        .from('produce_listings')
        .select('*')
        .in('farmer_id', farmerIds)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <main className="min-h-screen bg-gray-50">
      <RegionTopBar region={region} />
      <RegionHero region={region} farmerCount={farmers?.length ?? 0} produceCount={produce?.length ?? 0} />
      <RegionContent farmers={farmers ?? []} produce={produce ?? []} />
    </main>
  )
}
