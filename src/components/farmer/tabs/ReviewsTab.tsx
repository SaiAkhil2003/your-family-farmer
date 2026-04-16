'use client'

import { useLang } from '@/lib/LanguageContext'

type Review = {
  id: string
  reviewer_name: string
  reviewer_location?: string
  star_rating: number
  review_text?: string
  produce_ordered?: string
  created_at: string
}

export default function ReviewsTab({ reviews }: { reviews: Record<string, unknown>[] }) {
  const { tx } = useLang()
  const list = reviews as Review[]

  if (list.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">{tx.noReviews}</div>
  }

  const avg = list.reduce((sum, r) => sum + r.star_rating, 0) / list.length
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: list.filter((r) => r.star_rating === star).length,
  }))

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">{avg.toFixed(1)}</p>
            <p className="text-yellow-500 text-lg">{'★'.repeat(Math.round(avg))}</p>
            <p className="text-xs text-gray-500">{list.length} {tx.reviews}</p>
          </div>
          <div className="flex-1 space-y-1">
            {counts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3">{star}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: list.length ? `${(count / list.length) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-gray-500 w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((review) => (
          <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold text-sm flex-shrink-0">
                  {review.reviewer_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.reviewer_name}</p>
                  {review.reviewer_location && <p className="text-xs text-gray-500">{review.reviewer_location}</p>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-yellow-500 text-sm">{'★'.repeat(review.star_rating)}</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            {review.review_text && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{review.review_text}</p>}
            {review.produce_ordered && (
              <p className="text-xs text-green-700 font-semibold mt-2">{tx.bought} {review.produce_ordered}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
