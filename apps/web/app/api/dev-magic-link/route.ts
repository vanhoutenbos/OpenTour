import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_URL = 'https://open-tour-web.vercel.app';

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_DEV_MAGIC_LINK !== 'true') {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email verplicht' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  // Gebruik de action_link direct maar vervang de base URL
  // De action_link bevat al de juiste token_hash parameter
  const rawLink = data.properties.action_link;
  console.log('Raw action_link:', rawLink);

  // Haal de token_hash en type op uit de action_link
  const rawUrl = new URL(rawLink);
  const token_hash = rawUrl.searchParams.get('token_hash');
  const type = rawUrl.searchParams.get('type') ?? 'magiclink';

  // Bouw een schone link naar onze eigen callback
  const fixedLink = `${PRODUCTION_URL}/auth/callback?token_hash=${token_hash}&type=${type}`;

  return NextResponse.json({ link: fixedLink });
}
