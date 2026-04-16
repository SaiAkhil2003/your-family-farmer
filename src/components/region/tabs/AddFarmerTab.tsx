const TARGET = 10

const PATHWAYS = [
  {
    icon: '📱',
    title: 'WhatsApp onboarding',
    description: 'Share a WhatsApp link with the farmer. They answer 5 simple questions in Telugu and their profile goes live within 2 hours.',
    cta: 'Share onboarding link',
    color: 'bg-green-50 border-green-200',
    ctaColor: 'bg-green-700 text-white',
  },
  {
    icon: '👥',
    title: 'Refer a farmer',
    description: 'Know a natural farmer nearby? Share their name and number with us. We will onboard them and credit you as a referrer.',
    cta: 'Refer via WhatsApp',
    color: 'bg-blue-50 border-blue-200',
    ctaColor: 'bg-blue-700 text-white',
  },
  {
    icon: '🌾',
    title: 'Are you a farmer?',
    description: 'Sell your natural produce directly to local buyers. No middlemen. Set your own prices. Get paid directly.',
    cta: 'Join as a farmer',
    color: 'bg-amber-50 border-amber-200',
    ctaColor: 'bg-amber-700 text-white',
  },
]

const WHATSAPP_NUMBER = '916303425843'

export default function AddFarmerTab({ farmerCount }: { farmerCount: number }) {
  const progress = Math.min((farmerCount / TARGET) * 100, 100)

  const getWhatsAppLink = (pathway: number) => {
    const messages = [
      `Hello! I want to onboard a natural farmer near Tadepalligudem to YourFamilyFarmer. Can you share the onboarding link?`,
      `Hello! I want to refer a natural farmer near Tadepalligudem to YourFamilyFarmer. I will share their details.`,
      `Hello! I am a natural farmer near Tadepalligudem and I want to join YourFamilyFarmer and sell my produce directly.`,
    ]
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messages[pathway])}`
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800">Growing the network</p>
          <p className="text-sm font-bold text-green-700">{farmerCount} / {TARGET}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Target: {TARGET} natural farmers within 25 km by month 2
        </p>
      </div>

      {/* Pathway cards */}
      {PATHWAYS.map((pathway, i) => (
        <div key={pathway.title} className={`rounded-xl border p-4 ${pathway.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{pathway.icon}</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">{pathway.title}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{pathway.description}</p>
              <a
                href={getWhatsAppLink(i)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block text-xs font-semibold px-4 py-2 rounded-lg ${pathway.ctaColor}`}
              >
                {pathway.cta}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
