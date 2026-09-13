/**
 * The app's server side: a Supabase project. Values come from `.env.local`
 * as EXPO_PUBLIC_* variables, inlined into the bundle at build time.
 * Web analogy: NEXT_PUBLIC_* vars. They are public by design; secrets live in
 * the Edge Functions, never here.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set in .env.local');
}

export const SUPABASE_URL: string = url;
export const SUPABASE_PUBLISHABLE_KEY: string = key;
