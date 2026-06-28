import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEV_PASSWORD = 'dev-opentour-2025!';

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
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email verplicht' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    // 1. Zorg dat de user bestaat met bekend wachtwoord
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

    // 2. Geef het wachtwoord terug aan de client zodat die zelf
    //    kan inloggen via signInWithPassword — dat initialiseert
    //    de Supabase browser client sessie correct zonder cookie-magie
    return NextResponse.json({
      success: true,
      email,
      password: DEV_PASSWORD,
      supabaseUrl,
      anonKey,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[dev-magic-link]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
