import { NextRequest, NextResponse } from 'next/server';

interface AccessCodeRow {
  id: string;
  tournament_id: string;
  expires_at: string;
  is_active: boolean;
}

interface RecorderSession {
  tournamentId: string;
  accessCodeId: string;
  expiresAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string };
    const code = body.code?.toUpperCase().trim();

    if (!code || code.length !== 8) {
      return NextResponse.json({ error: 'Ongeldige code — voer 8 tekens in' }, { status: 400 });
    }

    // Directe fetch naar Supabase REST API — geen typed client
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/access_codes?code=eq.${code}&is_active=eq.true&select=id,tournament_id,expires_at,is_active&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Validatie mislukt' }, { status: 500 });
    }

    const rows: AccessCodeRow[] = await res.json();

    if (!rows.length) {
      return NextResponse.json({ error: 'Code ongeldig of verlopen' }, { status: 401 });
    }

    const accessCode = rows[0]!;

    if (new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Code verlopen — vraag een nieuwe code aan bij de organisator' },
        { status: 401 }
      );
    }

    const session: RecorderSession = {
      tournamentId: accessCode.tournament_id,
      accessCodeId: accessCode.id,
      expiresAt: accessCode.expires_at,
    };

    const response = NextResponse.json({
      valid: true,
      tournamentId: accessCode.tournament_id,
    });

    response.cookies.set('recorder_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(accessCode.expires_at),
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Validatie mislukt' }, { status: 500 });
  }
}
