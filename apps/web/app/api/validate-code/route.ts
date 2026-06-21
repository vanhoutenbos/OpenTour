/**
 * POST /api/validate-code
 * Valideert een toegangscode en start een recorder sessie.
 * Rate limiting wordt afgedwongen door de Cloudflare Worker.
 * Bij directe aanroep (zonder Worker): limiet op applicatieniveau via Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@opentour/supabase';
import type { RecorderSession } from '@opentour/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string };
    const code = body.code?.toUpperCase().trim();

    if (!code || code.length !== 8) {
      return NextResponse.json({ error: 'Ongeldige code — voer 8 tekens in' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: accessCodes, error } = await supabase
      .from('access_codes')
      .select('id, tournament_id, expires_at, is_active')
      .eq('code', code)
      .eq('is_active', true)
      .limit(1);

    if (error || !accessCodes?.length) {
      return NextResponse.json({ error: 'Code ongeldig of verlopen' }, { status: 401 });
    }

    const accessCode = accessCodes[0]!;

    if (new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Code verlopen — vraag een nieuwe code aan bij de organisator' },
        { status: 401 }
      );
    }

    // Sessie opslaan in cookie (httpOnly, secure)
    const session: RecorderSession = {
      supabaseUserId: 'anonymous', // Wordt vervangen door echte auth flow
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
