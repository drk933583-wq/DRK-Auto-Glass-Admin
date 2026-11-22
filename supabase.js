import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG, isConfigured } from './config.js';
// persistSession keeps the admin logged in across reloads.
export const supabase = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
