import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly from backend directory or workspace root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
// Clean any extraneous /rest/v1 suffix or trailing slashes
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log(`[NEXUS Backend] Supabase client initialized for ${supabaseUrl}`);
  } catch (err) {
    console.warn('[NEXUS Backend] Could not initialize Supabase client:', err.message);
  }
} else {
  console.log('[NEXUS Backend] No Supabase credentials configured. Running in local/in-memory mode.');
}

export { supabase };
export default supabase;
