import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use inert fallback values so builds can complete in environments where the
// public Supabase env vars are not injected during compilation.
const resolvedSupabaseUrl = supabaseUrl ?? 'https://placeholder.supabase.co'
const resolvedSupabaseAnonKey = supabaseAnonKey ?? 'placeholder-anon-key'

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey)
