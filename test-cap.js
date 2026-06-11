import 'dotenv/config';
import { supabaseAdmin } from './server/src/config/supabase.js';

async function check() {
  const { data } = await supabaseAdmin.from('user_profiles').select('*').ilike('email', '%zuasola%');
  console.log(JSON.stringify(data, null, 2));
}

check().catch(console.error);
