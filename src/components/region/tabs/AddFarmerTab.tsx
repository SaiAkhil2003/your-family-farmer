'use client'

import { useLang } from '@/lib/LanguageContext'

const TARGET = 10
const WHATSAPP_NUMBER = '916303425843'

export default function AddFarmerTab({ farmerCount }: { farmerCount: number }) {
  const { tx } = useLang()
  const progress = Math.min((farmerCount / TARGET) * 100, 100)

  const PATHWAYS = [
    {
      icon: '📱',
      title: tx.whatsappOnboarding,
      description: tx.whatsappOnboardingDesc,
      cta: tx.shareOnboardingLink,
      color: 'bg-green-50 border-green-200',
      ctaColor: 'bg-green-700 text-white',
      msgIndex: 0,
    },
    {
      icon: '👥',
      title: tx.referFarmer,
      description: tx.referFarmerDesc,
      cta: tx.referViaWhatsApp,
      color: 'bg-blue-50 border-blue-200',
      ctaColor: 'bg-blue-700 text-white',
      msgIndex: 1,
    },
    {
      icon: '🌾',
      title: tx.areYouFarmer,
      description: tx.areYouFarmerDesc,
      cta: tx.joinAsFarmer,
      color: 'bg-amber-50 border-amber-200',
      ctaColor: 'bg-amber-700 text-white',
      msgIndex: 2,
    },
  ]

  const getWhatsAppLink = (index: number) => {
    const messages = [
      `Hello! I want to onboard a natural farmer near Tadepalligudem to YourFamilyFarmer. Can you share the onboarding link?`,
      `Hello! I want to refer a natural farmer near Tadepalligudem to YourFamilyFarmer. I will share their details.`,
      `Hello! I am a natural farmer near Tadepalligudem and I want to join YourFamilyFarmer and sell my produce directly.`,
    ]
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messages[index])}`
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800">{tx.growingNetwork}</p>
          <p className="text-sm font-bold text-green-700">{farmerCount} / {TARGET}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {tx.target.replace('{target}', String(TARGET))}
        </p>
      </div>

      {PATHWAYS.map((pathway) => (
        <div key={pathway.title} className={`rounded-xl border p-4 ${pathway.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{pathway.icon}</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">{pathway.title}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{pathway.description}</p>
              <a
                href={getWhatsAppLink(pathway.msgIndex)}
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
