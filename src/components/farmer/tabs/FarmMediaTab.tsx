type Media = {
  id: string
  type: 'photo' | 'video'
  url: string
  caption?: string
  language?: string
  has_subtitles?: boolean
}

const PHOTO_PLACEHOLDERS = ['🌾', '🥬', '🌱', '🍅', '🌿', '🥕', '🌽', '🍆', '🌻', '🫑', '🥦', '🌾']

export default function FarmMediaTab({ media }: { media: Record<string, unknown>[] }) {
  const list = media as Media[]
  const photos = list.filter((m) => m.type === 'photo')
  const videos = list.filter((m) => m.type === 'video')

  const gridItems = photos.length > 0
    ? photos
    : PHOTO_PLACEHOLDERS.map((emoji, i) => ({ id: String(i), type: 'photo' as const, url: '', caption: emoji }))

  return (
    <div className="space-y-5">
      {/* Photo grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Farm photos</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {gridItems.slice(0, 12).map((item, i) => (
            <div
              key={item.id ?? i}
              className="aspect-square bg-green-50 rounded-lg flex items-center justify-center overflow-hidden relative border border-gray-100"
            >
              {item.url ? (
                <img src={item.url} alt={item.caption ?? ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{item.caption}</span>
              )}
            </div>
          ))}
        </div>
        {photos.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">Real photos coming soon</p>
        )}
      </div>

      {/* Videos */}
      {videos.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Farm videos</h3>
          <div className="space-y-2">
            {videos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">▶️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {video.caption ?? 'Farm video'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {video.language && (
                      <span className="text-xs text-gray-500">{video.language}</span>
                    )}
                    {video.has_subtitles && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        CC
                      </span>
                    )}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          Media will be added soon. Visit the farm on Saturday to see it in person!
        </p>
      )}
    </div>
  )
}
