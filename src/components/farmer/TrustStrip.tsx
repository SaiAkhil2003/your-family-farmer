type Farmer = {
  farming_since_year: number
  rating_avg: number
  buyer_count: number
}

export default function TrustStrip({
  farmer,
  produceCount,
}: {
  farmer: Farmer
  produceCount: number
}) {
  const yearsfarming = new Date().getFullYear() - farmer.farming_since_year

  const stats = [
    { label: 'Years farming', value: yearsfarming.toString() },
    { label: 'Star rating', value: `${farmer.rating_avg} ★` },
    { label: 'Buyers', value: farmer.buyer_count.toString() },
    { label: 'Chemicals', value: '0' },
    { label: 'Produce now', value: `${produceCount}` },
  ]

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="grid grid-cols-5 divide-x divide-gray-100">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center py-3 px-1">
            <span className="text-sm font-bold text-gray-900">{stat.value}</span>
            <span className="text-[10px] text-gray-500 text-center leading-tight mt-0.5">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
