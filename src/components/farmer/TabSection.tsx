'use client'

import { useState } from 'react'
import StoryTab from './tabs/StoryTab'
import ProduceTab from './tabs/ProduceTab'
import QualityTab from './tabs/QualityTab'
import ReviewsTab from './tabs/ReviewsTab'
import FarmMediaTab from './tabs/FarmMediaTab'

const TABS = ['Story', 'Produce', 'Quality', 'Reviews', 'Farm']

type Props = {
  farmer: Record<string, unknown>
  produce: Record<string, unknown>[]
  reviews: Record<string, unknown>[]
  media: Record<string, unknown>[]
}

export default function TabSection({ farmer, produce, reviews, media }: Props) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Sticky tab bar */}
      <div className="sticky top-[53px] z-40 bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === 0 && <StoryTab farmer={farmer} />}
        {activeTab === 1 && <ProduceTab farmer={farmer} produce={produce} />}
        {activeTab === 2 && <QualityTab farmer={farmer} produce={produce} />}
        {activeTab === 3 && <ReviewsTab reviews={reviews} />}
        {activeTab === 4 && <FarmMediaTab media={media} />}
      </div>
    </div>
  )
}
