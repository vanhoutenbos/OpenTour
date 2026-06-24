import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_URL = 'https://open-tour-web.vercel.app';

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_DEV_MAGIC_LINK !== 'true') {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ontbreekt' }, { status: 500 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'Ongeldige request body' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email verplicht' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${PRODUCTION_URL}/auth/callback` },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawUrl = new URL(data.properties.action_link);
    const callbackUrl = new URL(`${PRODUCTION_URL}/auth/callback`);
    rawUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });

    return NextResponse.json({ link: callbackUrl.toString() });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
