import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const DEV_PASSWORD = 'dev-opentour-2025!';

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK !== 'true') {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 403 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email verplicht' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // 1. User aanmaken of wachtwoord resetten via admin client
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find((u) => u.email === email);

    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password: DEV_PASSWORD });
    } else {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: email.split('@')[0] },
      });
      if (createErr) throw createErr;
    }

    // 2. Inloggen om access + refresh token te krijgen
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: signInErr } = await anon.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });

    if (signInErr || !data.session) {
      throw new Error(signInErr?.message ?? 'Geen sessie na inloggen');
    }

    // 3. Sessie in cookies schrijven via createServerClient
    // Dit gebruikt exact dezelfde cookie namen als de middleware,
    // zodat de volgende request direct herkend wordt als ingelogd.
    const response = NextResponse.json({ success: true });

    const serverClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set(name, value, {
            ...options,
            maxAge: 400 * 24 * 60 * 60, // 400 dagen
            path: '/',
            sameSite: 'lax',
            httpOnly: false,
          });
        },
        remove: (name, options) => {
          response.cookies.set(name, '', { ...options, maxAge: 0, path: '/' });
        },
      },
    });

    // setSession schrijft de tokens via de cookies.set callback hierboven
    await serverClient.auth.setSession(data.session);

    return response;

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[dev-magic-link]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
