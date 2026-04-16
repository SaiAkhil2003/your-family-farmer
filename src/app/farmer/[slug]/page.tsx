import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TopNav from '@/components/farmer/TopNav'
import FarmCover from '@/components/farmer/FarmCover'
import TrustStrip from '@/components/farmer/TrustStrip'
import TabSection from '@/components/farmer/TabSection'
import StickyBottomBar from '@/components/farmer/StickyBottomBar'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: farmer } = await supabase
    .from('farmers')
    .select('name, village, district')
    .eq('slug', slug)
    .single()

  if (!farmer) return { title: 'Farmer not found' }

  return {
    title: `${farmer.name}'s Farm — YourFamilyFarmer`,
    description: `Buy natural produce directly from ${farmer.name}, ${farmer.village}, ${farmer.district}`,
  }
}

export default async function FarmerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: farmer } = await supabase
    .from('farmers')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!farmer) notFound()

  const { data: produce } = await supabase
    .from('produce_listings')
    .select('*')
    .eq('farmer_id', farmer.id)
    .order('created_at', { ascending: false })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('farmer_id', farmer.id)
    .eq('approved', true)
    .order('created_at', { ascending: false })

  const { data: media } = await supabase
    .from('media')
    .select('*')
    .eq('farmer_id', farmer.id)
    .order('sort_order', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <TopNav regionSlug={farmer.region_slug} />
      <FarmCover farmer={farmer} />
      <TrustStrip farmer={farmer} produceCount={produce?.length ?? 0} />
      <TabSection
        farmer={farmer}
        produce={produce ?? []}
        reviews={reviews ?? []}
        media={media ?? []}
      />
      <StickyBottomBar farmer={farmer} />
    </main>
  )
}
