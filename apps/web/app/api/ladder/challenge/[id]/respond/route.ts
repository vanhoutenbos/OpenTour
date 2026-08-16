import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { response: 'accepted' | 'declined' };

    if (!body.response || !['accepted', 'declined'].includes(body.response)) {
      return NextResponse.json(
        { error: 'response moet "accepted" of "declined" zijn' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(_name: string, _value: string, _options?: CookieOptions) {},
          remove(_name: string, _options?: CookieOptions) {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 });
    }

    const { data: challenge } = await supabase
      .from('ladder_challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (!challenge) {
      return NextResponse.json(
        { error: 'Uitdaging niet gevonden' },
        { status: 404 }
      );
    }

    const { data: challengedTp } = await supabase
      .from('tournament_players')
      .select('id, profile_id')
      .eq('id', challenge.challenged_player_id)
      .single();

    if (challengedTp?.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Alleen de uitgedaagde kan reageren' },
        { status: 403 }
      );
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json(
        { error: 'Uitdaging is al beantwoord' },
        { status: 400 }
      );
    }

    if (body.response === 'declined') {
      const { data: updated } = await supabase
        .from('ladder_challenges')
        .update({ status: 'declined', resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return NextResponse.json(updated);
    }

    const { data: matchplayPairing } = await supabase
      .from('matchplay_pairings')
      .insert({
        tournament_id: challenge.tournament_id,
        player_a_id: challenge.challenger_player_id,
        player_b_id: challenge.challenged_player_id,
        format: 'matchplay',
        status: 'scheduled',
      })
      .select()
      .single();

    const { data: updated } = await supabase
      .from('ladder_challenges')
      .update({
        status: 'accepted',
        matchplay_pairing_id: matchplayPairing?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Interne fout' },
      { status: 500 }
    );
  }
}