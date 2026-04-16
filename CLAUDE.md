# YourFamilyFarmer — Project Context

## What this is
A mobile-first PWA connecting natural farmers to buyers in Andhra Pradesh.
No app download required. Built for slow Android 4G connections.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL) — DB + Storage
- Vercel hosting
- Twilio WhatsApp API (Week 2)

## Key Rules
- Mobile-first ALWAYS. Min viewport: 390px
- No payments, no native app, no admin panel at MVP
- Page load under 3 seconds on 4G
- English UI only at MVP

## Routes
- /farmer/[slug] — Farmer profile page (P1)
- /region/[slug] — Regional discovery page (P2)

## Dev Commands
- npm run dev — start local server
- npm run build — production build
