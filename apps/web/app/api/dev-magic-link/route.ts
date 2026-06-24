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
    options: {
      redirectTo: `${PRODUCTION_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Vervang de base URL in de action_link met de productie URL
  // zodat Supabase's eigen Site URL instelling er niet tussenzit
  const rawLink = data.properties.action_link;
  const linkUrl = new URL(rawLink);
  const fixedLink = `${PRODUCTION_URL}/auth/callback?${linkUrl.searchParams.toString()}`;

  return NextResponse.json({ link: fixedLink });
}
