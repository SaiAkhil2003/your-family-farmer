type Region = {
  name: string
  district: string
  state: string
}

export default function RegionHero({
  region,
  farmerCount,
  produceCount,
}: {
  region: Record<string, unknown>
  farmerCount: number
  produceCount: number
}) {
  const r = region as Region

  return (
    <div className="bg-green-800 px-4 py-6 text-white">
      <h1 className="text-xl font-bold leading-tight">
        Natural food from farmers near you
      </h1>
      <p className="text-green-200 text-sm mt-1">
        {r.district} district · Krishna river belt
      </p>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-green-700/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{farmerCount}</p>
          <p className="text-green-200 text-xs mt-0.5">Active farmers</p>
        </div>
        <div className="bg-green-700/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{produceCount}</p>
          <p className="text-green-200 text-xs mt-0.5">Produce listed</p>
        </div>
        <div className="bg-green-700/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-green-200 text-xs mt-0.5">Middlemen</p>
        </div>
      </div>
    </div>
  )
}
