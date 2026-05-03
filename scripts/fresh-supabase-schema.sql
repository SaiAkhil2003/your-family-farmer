-- ============================================================
-- YourFamilyFarmer fresh Supabase schema + seed
-- Safe to run on a brand-new Supabase project.
-- Re-running is also safe for the seeded region/farmer rows.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.regions (
  slug text primary key,
  name text not null,
  district text,
  state text default 'Andhra Pradesh',
  lat numeric(10,7),
  lng numeric(10,7),
  radius_km numeric,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  village text,
  district text,
  state text default 'Andhra Pradesh',
  phone text,
  method text default 'natural',
  farm_size_acres numeric,
  farming_since_year integer,
  story_quote text,
  soil_organic_carbon numeric,
  soil_ph numeric,
  brix_reading numeric,
  water_source text,
  delivery_available boolean default false,
  pickup_available boolean default true,
  farm_visit_day text,
  rating_avg numeric default 0,
  rating_count integer default 0,
  buyer_count integer default 0,
  region_slug text references public.regions(slug) on delete set null,
  active boolean default false,
  cover_photo_url text,
  photo_url text,
  pesticide_cert_url text,
  pickup_locations text[] default '{}'::text[],
  pickup_slots jsonb,
  lat numeric(10,7),
  lng numeric(10,7),
  location_name text,
  password_hash text,
  upi_id text,
  upi_name text,
  upi_qr_code_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.produce_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  name text not null,
  variety text,
  emoji text,
  method text,
  category text,
  unit text default 'kg',
  price_tier_1_qty numeric,
  price_tier_1_price numeric,
  price_tier_2_qty numeric,
  price_tier_2_price numeric,
  price_tier_3_qty numeric,
  price_tier_3_price numeric,
  stock_qty numeric,
  available_from date,
  available_to date,
  harvest_date date,
  brix numeric,
  soil_organic_carbon numeric,
  pesticide_result text,
  shelf_life_days integer,
  storage_notes text,
  description text,
  image_url text,
  status text default 'available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  produce_listing_id uuid references public.produce_listings(id) on delete set null,
  reviewer_name text,
  reviewer_location text,
  star_rating integer check (star_rating between 1 and 5),
  review_text text,
  produce_ordered text,
  approved boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.notify_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  produce_name text,
  requester_name text,
  requester_phone text,
  created_at timestamptz default now(),
  notified_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.farmers(id),
  produce_listing_id uuid references public.produce_listings(id) on delete set null,
  produce_name text,
  quantity numeric,
  unit text,
  total_price numeric,
  buyer_name text,
  buyer_phone text,
  pickup_location text,
  pickup_slot text,
  status text default 'pending',
  payment_method text default 'upi',
  payment_status text default 'pending',
  payment_screenshot_url text,
  utr_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  type text default 'photo',
  url text not null,
  caption text,
  language text,
  has_subtitles boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.wa_clicks (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.farmers(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.farmer_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.demand_intents (
  id uuid primary key default gen_random_uuid(),
  crop_name text not null,
  quantity_kg numeric,
  needed_by_date date,
  delivery_location text,
  requester_name text,
  requester_phone text,
  region_slug text,
  fulfilled boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_farmers_region_slug on public.farmers(region_slug);
create index if not exists idx_farmers_active on public.farmers(active);
create index if not exists idx_farmers_phone on public.farmers(phone);
create index if not exists idx_produce_listings_farmer_id on public.produce_listings(farmer_id);
create index if not exists idx_produce_listings_status on public.produce_listings(status);
create index if not exists idx_produce_listings_category on public.produce_listings(category);
create index if not exists idx_orders_farmer_id on public.orders(farmer_id);
create index if not exists idx_orders_buyer_phone on public.orders(buyer_phone);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_payment_method on public.orders(payment_method);
create index if not exists idx_reviews_farmer_id on public.reviews(farmer_id);
create index if not exists idx_notify_requests_farmer_id on public.notify_requests(farmer_id);
create index if not exists idx_media_farmer_id on public.media(farmer_id);
create index if not exists idx_media_type on public.media(type);
create index if not exists idx_wa_clicks_farmer_id on public.wa_clicks(farmer_id);
create index if not exists idx_farmer_otps_phone on public.farmer_otps(phone);
create index if not exists idx_farmer_otps_expires_at on public.farmer_otps(expires_at);
create index if not exists idx_demand_intents_region_slug on public.demand_intents(region_slug);
create index if not exists idx_demand_intents_fulfilled on public.demand_intents(fulfilled);

drop trigger if exists set_farmers_updated_at on public.farmers;
create trigger set_farmers_updated_at
before update on public.farmers
for each row
execute function public.set_updated_at();

drop trigger if exists set_produce_listings_updated_at on public.produce_listings;
create trigger set_produce_listings_updated_at
before update on public.produce_listings
for each row
execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.regions disable row level security;
alter table public.farmers disable row level security;
alter table public.produce_listings disable row level security;
alter table public.reviews disable row level security;
alter table public.notify_requests disable row level security;
alter table public.orders disable row level security;
alter table public.media disable row level security;
alter table public.wa_clicks disable row level security;
alter table public.demand_intents disable row level security;

alter table public.farmer_otps enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.regions to anon, authenticated, service_role;
grant select, insert, update, delete on public.farmers to anon, authenticated, service_role;
grant select, insert, update, delete on public.produce_listings to anon, authenticated, service_role;
grant select, insert, update, delete on public.reviews to anon, authenticated, service_role;
grant select, insert, update, delete on public.notify_requests to anon, authenticated, service_role;
grant select, insert, update, delete on public.orders to anon, authenticated, service_role;
grant select, insert, update, delete on public.media to anon, authenticated, service_role;
grant select, insert, update, delete on public.wa_clicks to anon, authenticated, service_role;
grant select, insert, update, delete on public.demand_intents to anon, authenticated, service_role;

revoke all on public.farmer_otps from anon, authenticated;
grant select, insert, update, delete on public.farmer_otps to service_role;

insert into storage.buckets (id, name, public)
values ('farm-images', 'farm-images', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "farm-images public read" on storage.objects;
create policy "farm-images public read"
on storage.objects
for select
using (bucket_id = 'farm-images');

drop policy if exists "farm-images public upload" on storage.objects;
create policy "farm-images public upload"
on storage.objects
for insert
with check (bucket_id = 'farm-images');

drop policy if exists "farm-images public update" on storage.objects;
create policy "farm-images public update"
on storage.objects
for update
using (bucket_id = 'farm-images')
with check (bucket_id = 'farm-images');

drop policy if exists "farm-images public delete" on storage.objects;
create policy "farm-images public delete"
on storage.objects
for delete
using (bucket_id = 'farm-images');

insert into public.regions (
  slug,
  name,
  district,
  state,
  lat,
  lng,
  radius_km,
  active
)
values (
  'tadepalligudem',
  'Tadepalligudem',
  'West Godavari',
  'Andhra Pradesh',
  16.8146000,
  81.5275000,
  35,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  district = excluded.district,
  state = excluded.state,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_km = excluded.radius_km,
  active = excluded.active;

insert into public.farmers (
  slug,
  name,
  village,
  district,
  state,
  phone,
  method,
  farm_size_acres,
  farming_since_year,
  story_quote,
  soil_organic_carbon,
  soil_ph,
  brix_reading,
  water_source,
  delivery_available,
  pickup_available,
  farm_visit_day,
  region_slug,
  active,
  pickup_locations,
  pickup_slots,
  lat,
  lng,
  location_name,
  upi_id,
  upi_name,
  upi_qr_code_url
)
values (
  'yadagiri',
  'Yadagiri',
  'Tadepalligudem',
  'West Godavari',
  'Andhra Pradesh',
  '919999999999',
  'natural',
  4.5,
  2012,
  'Healthy soil gives healthy food. We grow slowly and harvest only when ready.',
  1.9,
  6.8,
  8.5,
  'Borewell + rainwater recharge',
  false,
  true,
  'Sunday',
  'tadepalligudem',
  true,
  array['Farm gate pickup', 'Tadepalligudem town point'],
  '{"days":["Saturday","Sunday"],"time_from":"07:30","time_to":"11:30"}'::jsonb,
  16.8162000,
  81.5313000,
  'Near Tadepalligudem',
  'yadagiri@upi',
  'Yadagiri Natural Farm',
  null
)
on conflict (slug) do update
set
  name = excluded.name,
  village = excluded.village,
  district = excluded.district,
  state = excluded.state,
  phone = excluded.phone,
  method = excluded.method,
  farm_size_acres = excluded.farm_size_acres,
  farming_since_year = excluded.farming_since_year,
  story_quote = excluded.story_quote,
  soil_organic_carbon = excluded.soil_organic_carbon,
  soil_ph = excluded.soil_ph,
  brix_reading = excluded.brix_reading,
  water_source = excluded.water_source,
  delivery_available = excluded.delivery_available,
  pickup_available = excluded.pickup_available,
  farm_visit_day = excluded.farm_visit_day,
  region_slug = excluded.region_slug,
  active = excluded.active,
  pickup_locations = excluded.pickup_locations,
  pickup_slots = excluded.pickup_slots,
  lat = excluded.lat,
  lng = excluded.lng,
  location_name = excluded.location_name,
  upi_id = excluded.upi_id,
  upi_name = excluded.upi_name,
  upi_qr_code_url = excluded.upi_qr_code_url;

insert into public.produce_listings (
  farmer_id,
  name,
  variety,
  emoji,
  method,
  category,
  unit,
  price_tier_1_qty,
  price_tier_1_price,
  price_tier_2_qty,
  price_tier_2_price,
  price_tier_3_qty,
  price_tier_3_price,
  stock_qty,
  available_from,
  available_to,
  harvest_date,
  brix,
  soil_organic_carbon,
  pesticide_result,
  shelf_life_days,
  storage_notes,
  description,
  image_url,
  status
)
select
  f.id,
  'Tomatoes',
  'Local Red',
  '🍅',
  'natural',
  'vegetables',
  'kg',
  1,
  40,
  3,
  110,
  5,
  175,
  120,
  current_date - 1,
  current_date + 5,
  current_date,
  6.2,
  1.9,
  'No synthetic pesticide spray used',
  5,
  'Keep in a cool, airy basket.',
  'Field-picked tomatoes harvested for local pickup.',
  'https://images.unsplash.com/photo-1546470427-e5ac89cd0b4f?auto=format&fit=crop&w=1200&q=80',
  'available'
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.produce_listings p
    where p.farmer_id = f.id
      and p.name = 'Tomatoes'
      and coalesce(p.variety, '') = 'Local Red'
  );

insert into public.produce_listings (
  farmer_id,
  name,
  variety,
  emoji,
  method,
  category,
  unit,
  price_tier_1_qty,
  price_tier_1_price,
  price_tier_2_qty,
  price_tier_2_price,
  price_tier_3_qty,
  price_tier_3_price,
  stock_qty,
  available_from,
  available_to,
  harvest_date,
  brix,
  soil_organic_carbon,
  pesticide_result,
  shelf_life_days,
  storage_notes,
  description,
  image_url,
  status
)
select
  f.id,
  'Leafy Greens',
  'Mixed amaranthus',
  '🥬',
  'natural',
  'leafy',
  'bunch',
  1,
  20,
  3,
  55,
  5,
  85,
  80,
  current_date - 1,
  current_date + 3,
  current_date,
  null,
  1.9,
  'No residue test issues reported',
  2,
  'Use the same day or refrigerate lightly wrapped.',
  'Tender leafy greens cut early morning for weekend pickup.',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
  'available'
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.produce_listings p
    where p.farmer_id = f.id
      and p.name = 'Leafy Greens'
      and coalesce(p.variety, '') = 'Mixed amaranthus'
  );

insert into public.produce_listings (
  farmer_id,
  name,
  variety,
  emoji,
  method,
  category,
  unit,
  price_tier_1_qty,
  price_tier_1_price,
  price_tier_2_qty,
  price_tier_2_price,
  price_tier_3_qty,
  price_tier_3_price,
  stock_qty,
  available_from,
  available_to,
  harvest_date,
  brix,
  soil_organic_carbon,
  pesticide_result,
  shelf_life_days,
  storage_notes,
  description,
  image_url,
  status
)
select
  f.id,
  'Mangoes',
  'Banganapalli',
  '🥭',
  'natural',
  'fruits',
  'kg',
  1,
  90,
  3,
  255,
  5,
  420,
  0,
  current_date + 10,
  current_date + 30,
  null,
  14.5,
  1.9,
  'Expected soon',
  7,
  'Ripen at room temperature.',
  'Season opening soon. Buyers can request notification.',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80',
  'coming_soon'
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.produce_listings p
    where p.farmer_id = f.id
      and p.name = 'Mangoes'
      and coalesce(p.variety, '') = 'Banganapalli'
  );

insert into public.reviews (
  farmer_id,
  reviewer_name,
  reviewer_location,
  star_rating,
  review_text,
  produce_ordered,
  approved
)
select
  f.id,
  'Srilatha',
  'Tadepalligudem',
  5,
  'Tomatoes were fresh, firm, and tasted like home-grown produce.',
  'Tomatoes',
  true
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.reviews r
    where r.farmer_id = f.id
      and r.reviewer_name = 'Srilatha'
      and r.review_text = 'Tomatoes were fresh, firm, and tasted like home-grown produce.'
  );

insert into public.reviews (
  farmer_id,
  reviewer_name,
  reviewer_location,
  star_rating,
  review_text,
  produce_ordered,
  approved
)
select
  f.id,
  'Praveen',
  'Eluru',
  4,
  'Pickup was easy and the leafy greens stayed fresh till evening.',
  'Leafy Greens',
  true
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.reviews r
    where r.farmer_id = f.id
      and r.reviewer_name = 'Praveen'
      and r.review_text = 'Pickup was easy and the leafy greens stayed fresh till evening.'
  );

insert into public.reviews (
  farmer_id,
  reviewer_name,
  reviewer_location,
  star_rating,
  review_text,
  produce_ordered,
  approved
)
select
  f.id,
  'Harini',
  'Bhimavaram',
  5,
  'Good communication on WhatsApp and clean produce quality.',
  'Tomatoes, Leafy Greens',
  true
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.reviews r
    where r.farmer_id = f.id
      and r.reviewer_name = 'Harini'
      and r.review_text = 'Good communication on WhatsApp and clean produce quality.'
  );

insert into public.media (
  farmer_id,
  type,
  url,
  caption,
  language,
  has_subtitles,
  sort_order
)
select
  f.id,
  'photo',
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
  'Morning field view',
  'Telugu',
  false,
  1
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.media m
    where m.farmer_id = f.id
      and m.url = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
  );

insert into public.media (
  farmer_id,
  type,
  url,
  caption,
  language,
  has_subtitles,
  sort_order
)
select
  f.id,
  'photo',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
  'Tomato beds after harvest',
  'Telugu',
  false,
  2
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.media m
    where m.farmer_id = f.id
      and m.url = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80'
  );

insert into public.media (
  farmer_id,
  type,
  url,
  caption,
  language,
  has_subtitles,
  sort_order
)
select
  f.id,
  'video',
  'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
  'Short field walk-through',
  'Telugu',
  true,
  3
from public.farmers f
where f.slug = 'yadagiri'
  and not exists (
    select 1
    from public.media m
    where m.farmer_id = f.id
      and m.url = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
  );

update public.farmers f
set
  rating_avg = stats.avg_rating,
  rating_count = stats.review_count,
  buyer_count = stats.review_count
from (
  select
    farmer_id,
    round(avg(star_rating)::numeric, 1) as avg_rating,
    count(*)::integer as review_count
  from public.reviews
  where approved = true
  group by farmer_id
) stats
where f.id = stats.farmer_id
  and f.slug = 'yadagiri';
