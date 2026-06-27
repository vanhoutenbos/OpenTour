import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const DEV_PASSWORD = 'dev-password-opentour-2025';

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK !== 'true') {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 403 });
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
    // Admin client: user aanmaken of bijwerken
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userList } = await adminSupabase.auth.admin.listUsers();
    const existingUser = userList?.users.find((u) => u.email === email);

    if (existingUser) {
      await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        password: DEV_PASSWORD,
      });
    } else {
      await adminSupabase.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: email.split('@')[0] },
      });
    }

    // Inloggen en sessie verkrijgen
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });

    if (signInError || !data.session) {
      throw new Error(`Inloggen mislukt: ${signInError?.message ?? 'Geen sessie'}`);
    }

    // Sessie als cookie op de response zetten via SSR client
    // Zo leest de middleware hem direct op de volgende request
    const response = NextResponse.json({ success: true, email });

    const maxAge = 400 * 24 * 60 * 60;
    const cookieOpts = { path: '/', sameSite: 'lax' as const, httpOnly: false, secure: true, maxAge };

    // Supabase SSR verwacht de sessie in twee cookies: access + refresh
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
      .replace('https://', '')
      .split('.')[0];

    response.cookies.set(
      `sb-${projectRef}-auth-token`,
      JSON.stringify(data.session),
      cookieOpts
    );
    response.cookies.set(
      `sb-session`,
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: 'bearer',
        user: data.session.user,
      }),
      cookieOpts
    );

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
