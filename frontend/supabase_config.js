// DigiID Verify — Supabase Frontend Configuration
// Paste your Supabase URL and Anon Public Key here when deploying to Vercel
window.SUPABASE_URL = window.SUPABASE_URL || '';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client initialized in frontend');
}
