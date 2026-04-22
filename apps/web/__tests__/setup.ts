import { config as loadEnv } from 'dotenv';
import path from 'node:path';

// Route handlers read NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// from process.env. Load them from apps/web/.env.local before any import
// pulls a Supabase client into scope.
loadEnv({ path: path.resolve(__dirname, '../.env.local') });
