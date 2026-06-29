import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEV_PASSWORD = 'dev-password-opentour-2025';

export async function POST(request: NextRequest) {
  const devEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK === 'true' ||
    process.env.ENABLE_DEV_MAGIC_LINK === 'true';

  if (!devEnabled) {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 403 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Ongeldige request body' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email verplicht' }, { status: 400 });
  }

  try {
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
      const { error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: email.split('@')[0] },
      });
      if (createError) throw new Error(`User aanmaken mislukt: ${createError.message}`);
    }

    // Inloggen met wachtwoord — geef tokens terug aan de browser client
    // zodat die setSession() kan aanroepen en de sessie correct initialiseert
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

    return NextResponse.json({
      success: true,
      email,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    console.error('[dev-magic-link]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
