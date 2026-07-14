'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { userError } from '@/lib/errors';
import type { LadderStandingEntry } from './ladderUtils';

interface Props {
  tournamentId: string;
}

interface PlayerOption {
  id: string;
  name: string;
  handicap: number | null;
  category_id: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface LadderChallengeRow {
  id: string;
  tournament_id: string;
  challenger_player_id: string;
  challenged_player_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'forfeited';
  deadline_at: string;
}

interface LadderSettingsRow {
  handicap_allowance_pct: number;
  response_deadline_days: number;
}

/** Rekenhulp op basis van de NGF-methode (analyseplan §6): verschil in
 * baanhandicap x handicap allowance%, rekenkundig afgerond. Levert alleen
 * een VOORSTEL — de organisator bevestigt/past het uiteindelijke getal aan. */
function calculateSuggestedStrokes(hcpA: number, hcpB: number, allowancePct: number): number {
  return Math.round(Math.abs(hcpA - hcpB) * (allowancePct / 100));
}

export function LadderManagementPanel({ tournamentId }: Props) {
  const supabase = getSupabaseBrowser();

  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [standings, setStandings] = useState<LadderStandingEntry[]>([]);
  const [challenges, setChallenges] = useState<LadderChallengeRow[]>([]);
  const [settings, setSettings] = useState<LadderSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // "Genereer piramide"
  const [sortBy, setSortBy] = useState<'random' | 'handicap_asc' | 'handicap_desc'>('handicap_asc');
  const [splitByCategory, setSplitByCategory] = useState(true);

  // "Nieuwe uitdaging"
  const [challengerId, setChallengerId] = useState('');
  const [challengedId, setChallengedId] = useState('');

  // "Uitslag vastleggen" (per challenge, ingeklapt tenzij geopend)
  const [openResultFor, setOpenResultFor] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState('');
  const [resultType, setResultType] = useState<'played' | 'forfeit' | 'no_show'>('played');
  const [calcHcpA, setCalcHcpA] = useState('');
  const [calcHcpB, setCalcHcpB] = useState('');
  const [strokesGiven, setStrokesGiven] = useState('');
  const [strokesReceiverId, setStrokesReceiverId] = useState('');

  const load = async () => {
    setLoading(true);
    const [playersRes, categoriesRes, standingsRes, challengesRes, settingsRes] = await Promise.all([
      supabase.from('tournament_players').select('id, name, handicap, category_id')
        .eq('tournament_id', tournamentId).in('status', ['registered', 'confirmed']),
      supabase.from('tournament_categories').select('id, name').eq('tournament_id', tournamentId),
      supabase.from('ladder_standings').select('*').eq('tournament_id', tournamentId),
      supabase.from('ladder_challenges').select('id, tournament_id, challenger_player_id, challenged_player_id, status, deadline_at')
        .eq('tournament_id', tournamentId).in('status', ['pending', 'accepted']),
      supabase.from('ladder_settings').select('handicap_allowance_pct, response_deadline_days')
        .eq('tournament_id', tournamentId).single(),
    ]);

    setPlayers((playersRes.data as PlayerOption[]) ?? []);
    setCategories((categoriesRes.data as CategoryOption[]) ?? []);
    setStandings((standingsRes.data as LadderStandingEntry[]) ?? []);
    setChallenges((challengesRes.data as LadderChallengeRow[]) ?? []);
    setSettings((settingsRes.data as LadderSettingsRow) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '—';

  const generatePyramid = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('generate_ladder_pyramid', {
      p_tournament_id: tournamentId,
      p_sort_by: sortBy,
      p_split_by_category: splitByCategory,
    });
    if (err) {
      setError(userError(err, 'Kon de piramide niet genereren. Controleer of er al uitdagingen lopen.'));
    } else {
      await load();
    }
    setBusy(false);
  };

  const createChallenge = async () => {
    if (!challengerId || !challengedId || challengerId === challengedId) {
      setError('Kies twee verschillende spelers.');
      return;
    }
    setBusy(true);
    setError(null);
    const deadlineDays = settings?.response_deadline_days ?? 14;
    const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: err } = await supabase.from('ladder_challenges').insert({
      tournament_id: tournamentId,
      challenger_player_id: challengerId,
      challenged_player_id: challengedId,
      deadline_at: deadline,
    });
    if (err) {
      setError(userError(err, 'Kon de uitdaging niet aanmaken. Zitten beide spelers al niet in een andere uitdaging, en in dezelfde piramide?'));
    } else {
      setChallengerId('');
      setChallengedId('');
      await load();
    }
    setBusy(false);
  };

  const openResultForm = (challenge: LadderChallengeRow) => {
    setOpenResultFor(challenge.id);
    setWinnerId(challenge.challenger_player_id);
    setResultType('played');
    setCalcHcpA('');
    setCalcHcpB('');
    setStrokesGiven('');
    setStrokesReceiverId('');
  };

  const applyCalculator = () => {
    const hcpA = parseFloat(calcHcpA);
    const hcpB = parseFloat(calcHcpB);
    if (isNaN(hcpA) || isNaN(hcpB) || !openResultFor) return;
    const challenge = challenges.find((c) => c.id === openResultFor);
    if (!challenge) return;
    const allowance = settings?.handicap_allowance_pct ?? 100;
    const suggested = calculateSuggestedStrokes(hcpA, hcpB, allowance);
    setStrokesGiven(String(suggested));
    setStrokesReceiverId(hcpA > hcpB ? challenge.challenger_player_id : challenge.challenged_player_id);
  };

  const submitResult = async (challenge: LadderChallengeRow) => {
    if (!winnerId) { setError('Kies een winnaar.'); return; }
    setBusy(true);
    setError(null);

    // 1. Optioneel: leg de wedstrijd + handicapverrekening vast als matchplay_pairing
    // (alleen zinvol bij een daadwerkelijk gespeelde wedstrijd, niet bij forfait/no-show)
    if (resultType === 'played') {
      const { data: pairing, error: pairingErr } = await supabase
        .from('matchplay_pairings')
        .insert({
          tournament_id: tournamentId,
          player_a_id: challenge.challenger_player_id,
          player_b_id: challenge.challenged_player_id,
          strokes_given: strokesGiven ? Number(strokesGiven) : null,
          strokes_receiver_player_id: strokesReceiverId || null,
        })
        .select('id')
        .single();

      if (pairingErr) {
        setError(userError(pairingErr, 'Kon de wedstrijd niet vastleggen.'));
        setBusy(false);
        return;
      }

      const { error: linkErr } = await supabase
        .from('ladder_challenges')
        .update({ matchplay_pairing_id: pairing.id })
        .eq('id', challenge.id);
      if (linkErr) {
        setError(userError(linkErr, 'Wedstrijd vastgelegd, maar koppelen aan de uitdaging mislukte.'));
        setBusy(false);
        return;
      }
    }

    // 2. Uitslag verwerken: positiewissel + status
    const { error: resolveErr } = await supabase.rpc('resolve_ladder_challenge', {
      p_challenge_id: challenge.id,
      p_winner_player_id: winnerId,
      p_result_type: resultType,
    });
    if (resolveErr) {
      setError(userError(resolveErr, 'Kon de uitslag niet verwerken.'));
    } else {
      setOpenResultFor(null);
      await load();
    }
    setBusy(false);
  };

  if (loading) {
    return <div className="h-32 rounded-2xl bg-surface-2/80 animate-pulse" />;
  }

  const eligiblePlayers = (excludeId?: string) => {
    const busyPlayerIds = new Set(
      challenges.flatMap((c) => [c.challenger_player_id, c.challenged_player_id])
    );
    return players.filter((p) => p.id !== excludeId && !busyPlayerIds.has(p.id));
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Genereer piramide */}
      <section className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-content mb-1">Piramide indelen</h3>
        <p className="text-content-muted text-sm mb-4">
          {standings.length > 0
            ? `${standings.length} spelers staan momenteel ingedeeld. Opnieuw genereren overschrijft dit (kan niet meer zodra er geaccepteerde/afgeronde uitdagingen zijn).`
            : 'Nog geen piramide ingedeeld.'}
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-lg border border-border-strong bg-surface-3 text-content text-sm"
          >
            <option value="handicap_asc">Handicap oplopend</option>
            <option value="handicap_desc">Handicap aflopend</option>
            <option value="random">Willekeurig</option>
          </select>
          {categories.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-content-secondary">
              <input type="checkbox" checked={splitByCategory} onChange={(e) => setSplitByCategory(e.target.checked)} />
              Splits per categorie
            </label>
          )}
        </div>
        <button
          onClick={generatePyramid}
          disabled={busy || players.length === 0}
          className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          Genereer piramide
        </button>
      </section>

      {/* Nieuwe uitdaging */}
      <section className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-content mb-1">Uitdaging vastleggen</h3>
        <p className="text-content-muted text-sm mb-4">
          Leg vast wie wie uitdaagt (afgesproken buiten de app om, zie analyseplan §4).
        </p>
        <div className="flex flex-wrap gap-3">
          <select value={challengerId} onChange={(e) => setChallengerId(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-border-strong bg-surface-3 text-content text-sm">
            <option value="">Uitdager...</option>
            {eligiblePlayers(challengedId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={challengedId} onChange={(e) => setChallengedId(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-border-strong bg-surface-3 text-content text-sm">
            <option value="">Uitgedaagde...</option>
            {eligiblePlayers(challengerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={createChallenge}
            disabled={busy || !challengerId || !challengedId}
            className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            Vastleggen
          </button>
        </div>
      </section>

      {/* Lopende uitdagingen */}
      <section className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-content mb-3">
          Lopende uitdagingen ({challenges.length})
        </h3>
        {challenges.length === 0 ? (
          <p className="text-content-muted text-sm">Geen openstaande uitdagingen.</p>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => (
              <div key={c.id} className="rounded-xl border border-border-strong bg-surface-3/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-content">
                    <span className="font-medium">{playerName(c.challenger_player_id)}</span>
                    {' '}daagt uit{' '}
                    <span className="font-medium">{playerName(c.challenged_player_id)}</span>
                  </p>
                  <button
                    onClick={() => openResultForm(c)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    Uitslag vastleggen
                  </button>
                </div>

                {openResultFor === c.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <div>
                      <label className="block text-xs text-content-muted mb-1">Resultaat</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: 'played', label: 'Gespeeld' },
                          { value: 'forfeit', label: 'Forfait' },
                          { value: 'no_show', label: 'Niet verschenen' },
                        ].map((r) => (
                          <button
                            key={r.value}
                            onClick={() => setResultType(r.value as typeof resultType)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              resultType === r.value ? 'bg-green-900/30 border-green-600 text-content' : 'border-border-strong text-content-secondary'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-content-muted mb-1">Winnaar</label>
                      <div className="flex gap-2">
                        {[c.challenger_player_id, c.challenged_player_id].map((pid) => (
                          <button
                            key={pid}
                            onClick={() => setWinnerId(pid)}
                            className={`flex-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              winnerId === pid ? 'bg-green-900/30 border-green-600 text-content' : 'border-border-strong text-content-secondary'
                            }`}
                          >
                            {playerName(pid)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {resultType === 'played' && (
                      <div className="rounded-lg border border-border bg-surface-2/60 p-3 space-y-2">
                        <p className="text-xs text-content-muted">
                          Rekenhulp (§6): baanhandicap van beide spelers → voorstel voor aantal
                          slagen, op basis van het ladder-percentage ({settings?.handicap_allowance_pct ?? 100}%).
                          Zelf aan te passen na berekenen.
                        </p>
                        <div className="flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="block text-[11px] text-content-muted">Baanhcp {playerName(c.challenger_player_id)}</label>
                            <input type="number" step="0.1" value={calcHcpA} onChange={(e) => setCalcHcpA(e.target.value)}
                              className="w-24 px-2 py-1 rounded border border-border-strong bg-surface-3 text-content text-sm" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-content-muted">Baanhcp {playerName(c.challenged_player_id)}</label>
                            <input type="number" step="0.1" value={calcHcpB} onChange={(e) => setCalcHcpB(e.target.value)}
                              className="w-24 px-2 py-1 rounded border border-border-strong bg-surface-3 text-content text-sm" />
                          </div>
                          <button onClick={applyCalculator}
                            className="text-xs px-3 py-1.5 rounded-lg border border-border-strong text-content-secondary hover:border-emerald-500/40">
                            Bereken
                          </button>
                        </div>
                        <div className="flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="block text-[11px] text-content-muted">Aantal slagen</label>
                            <input type="number" min={0} value={strokesGiven} onChange={(e) => setStrokesGiven(e.target.value)}
                              className="w-24 px-2 py-1 rounded border border-border-strong bg-surface-3 text-content text-sm" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-content-muted">Wie ontvangt ze</label>
                            <select value={strokesReceiverId} onChange={(e) => setStrokesReceiverId(e.target.value)}
                              className="px-2 py-1 rounded border border-border-strong bg-surface-3 text-content text-sm">
                              <option value="">— bruto —</option>
                              <option value={c.challenger_player_id}>{playerName(c.challenger_player_id)}</option>
                              <option value={c.challenged_player_id}>{playerName(c.challenged_player_id)}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => submitResult(c)}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                      >
                        Bevestigen
                      </button>
                      <button
                        onClick={() => setOpenResultFor(null)}
                        className="px-4 py-2 rounded-xl border border-border-strong text-content-secondary text-sm"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
