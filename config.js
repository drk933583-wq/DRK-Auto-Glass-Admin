// Central Supabase config. Use ONLY the project URL and the public anon/publishable key here.
// NEVER put a secret / admin ("service") key in any frontend file.
export const CONFIG = {
  SUPABASE_URL: 'https://fuixrhalczukhpeizqon.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_IPzWq9X1W32LnIwQ8rUFVw_9nbDXy_O',
};
export const isConfigured = () => !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR-ANON');
