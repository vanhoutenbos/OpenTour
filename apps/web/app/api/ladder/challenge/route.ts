import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tournament_id: string;
      challenged_player_id: string;
    };

    const { tournament_id, challenged_player_id } = body;

    if (!tournament_id || !challenged_player_id) {
      return NextResponse.json(
        { error: 'tournament_id en challenged_player_id zijn verplicht' },
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

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, competition_type')
      .eq('id', tournament_id)
      .single();

    if (!tournament || tournament.competition_type !== 'ladder') {
      return NextResponse.json(
        { error: 'Toernooi is geen laddercompetitie' },
        { status: 400 }
      );
    }

    const { data: challengerTp } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('tournament_id', tournament_id)
      .eq('profile_id', user.id)
      .single();

    if (!challengerTp) {
      return NextResponse.json(
        { error: 'U bent geen deelnemer van dit toernooi' },
        { status: 403 }
      );
    }

    if (challengerTp.id === challenged_player_id) {
      return NextResponse.json(
        { error: 'U kunt uzelf niet uitdagen' },
        { status: 400 }
      );
    }

    const { data: settings } = await supabase
      .from('ladder_settings')
      .select('response_deadline_days')
      .eq('tournament_id', tournament_id)
      .single();

    const deadlineAt = new Date();
    deadlineAt.setDate(deadlineAt.getDate() + (settings?.response_deadline_days || 14));

    const { data: challenge, error } = await supabase
      .from('ladder_challenges')
      .insert({
        tournament_id,
        challenger_player_id: challengerTp.id,
        challenged_player_id,
        deadline_at: deadlineAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Uitdaging aanmaken mislukt: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(challenge, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Interne fout' },
      { status: 500 }
    );
  }
}
