import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookies = Object.fromEntries(
    request.cookies.getAll().map(c => [c.name, c.value.slice(0, 50) + '...'])
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookies_present: Object.keys(cookies),
    supabase_auth_cookies: Object.keys(cookies).filter(k => k.includes('sb-')),
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    error: error?.message ?? null,
  });
}
