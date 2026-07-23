import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.length !== 36) {
      return NextResponse.json({ error: 'Ongeldig toernooi ID' }, { status: 400 });
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

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, is_public, status')
      .eq('id', id)
      .single();

    if (!tournament) {
      return NextResponse.json({ error: 'Toernooi niet gevonden' }, { status: 404 });
    }

    if (!tournament.is_public && tournament.status === 'draft') {
      return NextResponse.json({ error: 'Toernooi niet gevonden' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('tournament_players')
      .select('id, name, handicap, gender, status, flight_id')
      .eq('tournament_id', id)
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'Spelers ophalen mislukt' }, { status: 500 });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 });
  }
}
