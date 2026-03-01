import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        // IMPORTANT:
        // In Next.js Server Components, cookies cannot be modified.
        // Session refresh cookie writes are handled in middleware.ts.
        setAll() {
          // no-op on purpose
        },
      },
    }
  );
}