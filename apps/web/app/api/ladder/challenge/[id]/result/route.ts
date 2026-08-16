import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      winner_player_id: string;
      result_type: 'played' | 'forfeit' | 'no_show' | 'declined';
    };

    const { winner_player_id, result_type } = body;

    if (!winner_player_id || !result_type) {
      return NextResponse.json(
        { error: 'winner_player_id en result_type zijn verplicht' },
        { status: 400 }
      );
    }

    if (!['played', 'forfeit', 'no_show', 'declined'].includes(result_type)) {
      return NextResponse.json(
        { error: 'Ongeldig result_type' },
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

    if (challenge.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Uitdaging is niet geaccepteerd' },
        { status: 400 }
      );
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', challenge.tournament_id)
      .single();

    if (tournament?.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Alleen de organisator kan het resultaat invoeren' },
        { status: 403 }
      );
    }

    const { data: result } = await supabase.rpc('resolve_ladder_challenge', {
      p_challenge_id: id,
      p_winner_player_id: winner_player_id,
      p_result_type: result_type,
    });

    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Interne fout' },
      { status: 500 }
    );
  }
}