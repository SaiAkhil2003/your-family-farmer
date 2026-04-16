import Link from 'next/link'

type Produce = {
  id: string
  name: string
  variety?: string
  emoji?: string
  farmer_id: string
  price_tier_1_price?: number
  unit?: string
  stock_qty?: number
  method?: string
}

type Farmer = {
  id: string
  slug: string
  name: string
  village?: string
}

export default function BrowseProduceTab({
  produce,
  farmers,
}: {
  produce: Record<string, unknown>[]
  farmers: Record<string, unknown>[]
}) {
  const list = produce as Produce[]
  const farmerList = farmers as Farmer[]

  const getFarmer = (farmerId: string) =>
    farmerList.find((f) => f.id === farmerId)

  if (list.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No produce found for this filter.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((item) => {
        const farmer = getFarmer(item.farmer_id)
        if (!farmer) return null

        return (
          <Link
            key={item.id}
            href={`/farmer/${farmer.slug}#produce`}
            className="bg-white rounded-xl border border-gray-100 p-3 block"
          >
            <div className="text-3xl mb-2">{item.emoji ?? '🌿'}</div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.name}</h3>
            {item.variety && (
              <p className="text-[10px] text-gray-500 mt-0.5">{item.variety}</p>
            )}
            <p className="text-xs text-green-700 font-semibold mt-1">
              {farmer.name} · {farmer.village}
            </p>
            <div className="flex items-center justify-between mt-2">
              {item.price_tier_1_price && (
                <span className="text-sm font-bold text-gray-900">
                  ₹{item.price_tier_1_price}/{item.unit ?? 'kg'}
                </span>
              )}
              {item.method === 'natural' && (
                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Natural
                </span>
              )}
            </div>
            {item.stock_qty !== undefined && item.stock_qty > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">{item.stock_qty} kg available</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
