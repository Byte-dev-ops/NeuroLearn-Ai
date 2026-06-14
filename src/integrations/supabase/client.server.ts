// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
// For user-authenticated queries (with RLS), use the auth middleware instead.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    // Warn but don't throw – quiz caching via admin client is optional.
    // The app will still work, but quiz results won't be cached server-side.
    console.warn(`[Supabase Admin] Missing env var(s): ${missing.join(', ')}. Admin operations disabled.`);
    return null;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Load inside server handlers: const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
// Top-level import is safe only in other .server.ts modules - route files and *.functions.ts ship to the client bundle.
export const supabaseAdmin = new Proxy({} as NonNullable<ReturnType<typeof createSupabaseAdminClient>>, {
  get(_, prop, receiver) {
    if (_supabaseAdmin === undefined) _supabaseAdmin = createSupabaseAdminClient();
    if (_supabaseAdmin === null) {
      // Return a no-op function for any property access when admin client is unavailable
      return () => Promise.resolve({ data: null, error: new Error('Supabase admin client not configured') });
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
