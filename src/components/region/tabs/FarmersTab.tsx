import Link from 'next/link'

type Farmer = {
  id: string
  slug: string
  name: string
  village?: string
  district?: string
  method?: string
  rating_avg?: number
  farming_since_year?: number
}

type Produce = {
  farmer_id: string
  name: string
  emoji?: string
}

export default function FarmersTab({
  farmers,
  produce,
  highlightedFarmerId,
}: {
  farmers: Record<string, unknown>[]
  produce: Record<string, unknown>[]
  highlightedFarmerId: string | null
}) {
  const list = farmers as Farmer[]
  const produceList = produce as Produce[]

  if (list.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No farmers found for this filter.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {list.map((farmer, index) => {
        const farmerProduce = produceList.filter((p) => p.farmer_id === farmer.id)
        const isHighlighted = highlightedFarmerId === farmer.id
        const isCofounder = index === 0
        const initials = farmer.name.slice(0, 2).toUpperCase()
        const yearsfarming = farmer.farming_since_year
          ? new Date().getFullYear() - farmer.farming_since_year
          : null

        return (
          <div
            key={farmer.id}
            className={`bg-white rounded-xl border p-4 transition-all ${
              isHighlighted ? 'border-green-500 shadow-md' : 'border-gray-100'
            } ${isCofounder ? 'border-l-4 border-l-green-600' : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-green-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-sm">{farmer.name}</h3>
                  {isCofounder && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      co-founder
                    </span>
                  )}
                  {farmer.rating_avg === 0 && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      new
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {farmer.village ?? farmer.district}
                  {yearsfarming ? ` · ${yearsfarming} yrs farming` : ''}
                </p>

                {/* Produce pills */}
                {farmerProduce.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {farmerProduce.slice(0, 4).map((p) => (
                      <span
                        key={p.name}
                        className="bg-green-50 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        {p.emoji ?? '🌿'} {p.name}
                      </span>
                    ))}
                    {farmerProduce.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{farmerProduce.length - 4} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {farmer.method === 'natural' && (
                      <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Natural
                      </span>
                    )}
                    {farmer.rating_avg ? (
                      <span className="text-xs text-gray-600">⭐ {farmer.rating_avg}</span>
                    ) : null}
                  </div>
                  <Link
                    href={`/farmer/${farmer.slug}`}
                    className="bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    View shop
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Know a farmer card */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-gray-600">Know a natural farmer nearby?</p>
        <p className="text-xs text-gray-400 mt-1">Help them reach more buyers</p>
        <button
          onClick={() => {
            const tab = document.querySelectorAll('button[class*="border-b-2"]')
            if (tab[2]) (tab[2] as HTMLButtonElement).click()
          }}
          className="mt-3 bg-green-50 text-green-700 border border-green-600 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Add a farmer →
        </button>
      </div>
    </div>
  )
}
