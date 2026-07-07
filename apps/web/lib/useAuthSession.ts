'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AuthSessionUser {
  id: string;
  email: string | null;
  display_name: string | null;
}

interface SessionApiResponse {
  status: 'authenticated' | 'unauthenticated' | 'error';
  user: AuthSessionUser | null;
}

const RETRY_DELAY_MS = 2000;
// Aantal opeenvolgende technische storingen voordat we het aan de gebruiker
// laten zien. Bij minder dan dit aantal houden we gewoon de laatst bekende
// (optimistische) staat aan — één netwerkhikje moet niemand raken.
const FAILURES_BEFORE_DEGRADED = 2;

export interface UseAuthSessionResult {
  /** Laatst bekende gebruiker. Blijft staan tijdens tijdelijke storingen (optimistisch). */
  user: AuthSessionUser | null;
  /** True zolang de allereerste check nog niet is afgerond. */
  loading: boolean;
  /**
   * True zodra de sessie-check herhaaldelijk (zie FAILURES_BEFORE_DEGRADED)
   * niet gevalideerd kon worden door een technische storing. `user` blijft
   * intussen de laatst bekende staat tonen — dit is puur een signaal om een
   * "kon niet verifiëren"-melding te tonen naast de bestaande UI.
   */
  degraded: boolean;
  /** Handmatig opnieuw valideren, bijv. na een 'probeer opnieuw'-knop. */
  refresh: () => Promise<void>;
}

/**
 * Single source of truth voor "ben ik ingelogd?" in de hele app.
 *
 * Vervangt losse getSupabaseBrowser().auth.getSession()/onAuthStateChange
 * calls per component. Die lazen alleen lokale (browser-)storage uit, wat
 * kon afwijken van wat de server daadwerkelijk als geldig beschouwt —
 * vandaar het "cookie staat er nog, sessie is geldig, maar UI toont
 * uitgelogd"-probleem. Deze hook praat in plaats daarvan met
 * /api/auth/session, dat de sessie ECHT bij Supabase valideert (getUser())
 * en de cookie actief opruimt zodra die aantoonbaar ongeldig is.
 *
 * Gedrag bij technische storingen (netwerk, Supabase 5xx): de laatst bekende
 * `user`-waarde blijft staan (optimistisch) totdat er FAILURES_BEFORE_DEGRADED
 * keer op rij niet gevalideerd kon worden. Pas dan gaat `degraded` aan, zodat
 * de UI een "kon niet verifiëren door een technische storing"-melding kan
 * tonen zonder de gebruiker voortijdig als uitgelogd te behandelen.
 */
export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const consecutiveFailures = useRef(0);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data: SessionApiResponse = await res.json();

      if (!mounted.current) return;

      if (data.status === 'error') {
        consecutiveFailures.current += 1;
        if (consecutiveFailures.current >= FAILURES_BEFORE_DEGRADED) {
          setDegraded(true);
        } else {
          // Eerste hikje: laatst bekende staat laten staan, snel opnieuw proberen.
          retryTimeout.current = setTimeout(check, RETRY_DELAY_MS);
        }
        return;
      }

      // Succesvolle, definitieve uitspraak (authenticated of unauthenticated).
      consecutiveFailures.current = 0;
      setDegraded(false);
      setUser(data.user);
    } catch {
      if (!mounted.current) return;
      consecutiveFailures.current += 1;
      if (consecutiveFailures.current >= FAILURES_BEFORE_DEGRADED) {
        setDegraded(true);
      } else {
        retryTimeout.current = setTimeout(check, RETRY_DELAY_MS);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    check();
    return () => {
      mounted.current = false;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, [check]);

  return { user, loading, degraded, refresh: check };
}
