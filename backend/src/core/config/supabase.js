'use strict';

require('dotenv').config();

let supabase = null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

try {
    const { createClient } = require('@supabase/supabase-js');
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (err) {
    // If @supabase/supabase-js is not installed or unconfigured, safely fallback to null (uses PG Pool)
    supabase = null;
}

module.exports = { supabase };
