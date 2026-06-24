import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEV_PASSWORD = 'dev-password-opentour-2025';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK !== 'true') {
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user if not exists (email_confirm: true + dev password)
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: email.split('@')[0] },
    });

    if (createError && !createError.message.includes('already exists')) {
      throw new Error(`User aanmaken mislukt: ${createError.message}`);
    }

    // Sign in with password — the client will use these tokens to set session
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });

    if (signInError || !data.session) {
      throw new Error(`Inloggen mislukt: ${signInError?.message ?? 'Geen session'}`);
    }

    return NextResponse.json({
      success: true,
      email,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}