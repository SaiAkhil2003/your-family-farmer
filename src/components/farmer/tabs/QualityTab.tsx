type Farmer = {
  soil_organic_carbon?: number
  soil_ph?: number
  brix_reading?: number
}

type Produce = {
  name: string
  brix?: number
  pesticide_result?: string
  storage_notes?: string
  emoji?: string
}

export default function QualityTab({
  farmer,
  produce,
}: {
  farmer: Record<string, unknown>
  produce: Record<string, unknown>[]
}) {
  const f = farmer as Farmer
  const listings = produce as Produce[]
  const available = listings.filter((p) => (p as Record<string, unknown>).status === 'available')

  return (
    <div className="space-y-5">
      {/* Soil health */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Soil health</h3>
        <div className="grid grid-cols-3 gap-2">
          <SoilCard
            label="Organic Carbon"
            value={f.soil_organic_carbon ? `${f.soil_organic_carbon}%` : '—'}
            icon="🌱"
            good={f.soil_organic_carbon ? f.soil_organic_carbon >= 1.5 : false}
          />
          <SoilCard
            label="Soil pH"
            value={f.soil_ph?.toString() ?? '—'}
            icon="⚗️"
            good={f.soil_ph ? f.soil_ph >= 6 && f.soil_ph <= 7.5 : false}
          />
          <SoilCard
            label="NPK Balance"
            value="Natural"
            icon="🧪"
            good={true}
          />
        </div>

        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <span className="font-semibold">Last soil test:</span> ANGRAU Lab, Guntur ·{' '}
          <span className="text-green-700 font-semibold">Results: Healthy</span>
        </div>
      </div>

      {/* Produce quality */}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Produce quality</h3>
          <div className="space-y-2">
            {available.map((item) => (
              <div key={item.name} className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {item.emoji ?? '🌿'} {item.name}
                  </span>
                  <div className="flex gap-2">
                    {item.brix && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        BRIX {item.brix}
                      </span>
                    )}
                    {item.pesticide_result && (
                      <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.pesticide_result}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRIX explainer */}
      <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
        <h3 className="text-sm font-bold text-amber-900 mb-2">What is BRIX?</h3>
        <p className="text-xs text-amber-800 leading-relaxed">
          BRIX measures the sugar and nutrient density in produce. Higher BRIX = more flavour,
          better nutrition, and longer shelf life. Chemically grown vegetables typically score 4–6.
          Naturally grown produce scores 10–14+. A refractometer is used to measure it.
        </p>
      </div>

      {/* Storage guide */}
      {available.some((p) => p.storage_notes) && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Storage guide</h3>
          <div className="space-y-2">
            {available
              .filter((p) => p.storage_notes)
              .map((item) => (
                <div key={item.name} className="bg-white rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700">{item.emoji ?? '🌿'} {item.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.storage_notes}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SoilCard({
  label,
  value,
  icon,
  good,
}: {
  label: string
  value: string
  icon: string
  good: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-sm font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
      <span className={`text-[10px] font-bold ${good ? 'text-green-600' : 'text-amber-600'}`}>
        {good ? '✓ Good' : 'Monitor'}
      </span>
    </div>
  )
}
