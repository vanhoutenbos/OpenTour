import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

/**
 * Single source of truth voor "ben ik ingelogd?" aan de client-kant.
 *
 * In plaats van dat elke client component zelf getSupabaseBrowser().auth.getSession()
 * of onAuthStateChange gebruikt (wat lokaal, ongevalideerd storage uitleest en kan
 * afwijken van wat de server ziet), roept de UI deze route aan. Deze route:
 *   1. Leest de sessie-cookie.
 *   2. Valideert 'm ECHT bij Supabase via getUser() (netwerkcall, niet alleen
 *      een lokale JWT-decode) — dit is de daadwerkelijke autoriteit.
 *   3. Is de sessie AANTOONBAAR ongeldig (verlopen/ingetrokken refresh token,
 *      geen sessie aanwezig): cookie actief verwijderen (Max-Age=0) en
 *      { status: 'unauthenticated', user: null } teruggeven.
 *   4. Is er een TIJDELIJKE storing (netwerkfout, Supabase 5xx, onbekende
 *      fout): cookie met rust laten en { status: 'error', user: null }
 *      teruggeven, zodat de UI "even niet gelukt, technische storing" kan
 *      tonen in plaats van de gebruiker stilletjes uit te loggen.
 *   5. Is de sessie geldig: { status: 'authenticated', user: {...} }.
 *
 * We gebruiken hier bewust getUser() (niet getClaims() zoals in middleware.ts):
 * middleware draait op elke request en moet rate-limits vermijden, deze route
 * wordt alleen bij page-load / expliciete auth-checks aangeroepen en moet de
 * sterkste garantie geven dat de sessie ook echt (nog) geldig is.
 */
export async function GET(request: NextRequest) {
  const cookiesToClear: SupabaseCookie[] = [];
  const requestCookies = request.cookies.getAll();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requestCookies;
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          // auth-js roept dit aan om cookies te VERWIJDEREN (lege waarde,
          // maxAge 0) in sommige interne paden (bijv. tijdens een refresh-
          // poging). We bewaren die operaties en passen ze pas toe als we
          // hieronder zelf ook concluderen dat de sessie echt ongeldig is.
          //
          // Let op: getUser() roept dit NIET aan wanneer Supabase de token
          // simpelweg met 401/403 afwijst (geen refresh-poging, alleen een
          // afgekeurde /user call) — vandaar de aparte, expliciete opruiming
          // hieronder op basis van requestCookies zelf.
          cookiesToClear.push(...cookiesToSet);
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  let sessionIsDefinitivelyInvalid = false;
  let transientError = false;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isAuthSessionMissingError(error)) {
        // Geen sessie aanwezig (geen cookie, of storage leeg) — niets te
        // verwijderen, gewoon niet ingelogd.
        sessionIsDefinitivelyInvalid = true;
      } else if (isAuthApiError(error)) {
        // Supabase heeft de token expliciet afgewezen. Statussen 401/403
        // betekenen: token ongeldig/verlopen/ingetrokken -> echt uitgelogd.
        // Andere statussen (5xx, rate limiting) zijn tijdelijk van aard.
        if (error.status === 401 || error.status === 403) {
          sessionIsDefinitivelyInvalid = true;
        } else {
          transientError = true;
        }
      } else if (isAuthRetryableFetchError(error)) {
        // Expliciet een fout die auth-js zelf als "probeer opnieuw" ziet
        // (netwerkfout, timeout, 5xx). Sessie kan nog prima geldig zijn.
        transientError = true;
      } else {
        // Onbekende foutvorm: wees voorzichtig en behandel als tijdelijk,
        // niet als "uitgelogd" — beter een storingsmelding tonen dan
        // onterecht mensen uit te loggen.
        transientError = true;
      }
    } else {
      user = data.user;
    }
  } catch {
    // Netwerkfout die niet eens als AuthError terugkwam (bijv. fetch gooide
    // rechtstreeks een TypeError). Ook hier: tijdelijke storing, niet
    // "uitgelogd".
    transientError = true;
  }

  if (transientError) {
    return NextResponse.json({ status: 'error', user: null }, { status: 503 });
  }

  let profile: { display_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const response = NextResponse.json({
    status: user ? 'authenticated' : 'unauthenticated',
    user: user
      ? { id: user.id, email: user.email ?? null, display_name: profile?.display_name ?? null }
      : null,
  });

  if (sessionIsDefinitivelyInvalid) {
    // 1) Alles wat auth-js zelf al als "te verwijderen" markeerde (sommige
    //    interne refresh-paden roepen setAll hiervoor aan).
    const clearedNames = new Set<string>();
    for (const { name, options } of cookiesToClear) {
      response.cookies.set(name, '', {
        ...(options as CookieOptions | undefined),
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      });
      clearedNames.add(name);
    }

    // 2) Fallback: getUser() geeft bij een simpele 401/403 GEEN setAll-call
    //    (dat pad zit alleen in refresh-gerelateerde interne logica). Ruim
    //    daarom zelf elke cookie op die bij de Supabase auth-token-storage
    //    hoort, inclusief chunked varianten (naam, naam.0, naam.1, ...) —
    //    zie @supabase/ssr's chunker: sessies die de ~3180-byte grens per
    //    cookie overschrijden worden over meerdere cookies gesplitst.
    for (const { name } of requestCookies) {
      if (clearedNames.has(name)) continue;
      if (/^sb-.*-auth-token(\.\d+)?$/.test(name)) {
        response.cookies.set(name, '', { path: '/', sameSite: 'lax', maxAge: 0 });
      }
    }
  }

  return response;
}
