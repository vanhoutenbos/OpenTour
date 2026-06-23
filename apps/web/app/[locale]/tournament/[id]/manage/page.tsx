'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface Tournament {
  id: string;
  name: string;
  status: string;
  format: string;
  scoring_type: string;
  rounds: number;
  start_date: string | null;
  pause_reason: string | null;
  is_public: boolean;
  created_by: string;
}

interface Player {
  id: string;
  name: string;
  handicap: number | null;
  status: string;
  flight_id: string | null;
}

interface AccessCode {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
}

export default function ManageTournamentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'codes'>('overview');
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [addPlayerName, setAddPlayerName] = useState('');
  const [addPlayerHandicap, setAddPlayerHandicap] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const supabase = getSupabaseBrowser();

  const loadData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/nl/login'); return; }

    const { data: t } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', params.id)
      .eq('created_by', userData.user.id)
      .single();

    if (!t) { router.replace('/nl/dashboard'); return; }
    setTournament(t as Tournament);

    const { data: p } = await supabase
      .from('tournament_players')
      .select('id, name, handicap, status, flight_id')
      .eq('tournament_id', params.id)
      .order('name');
    setPlayers((p as Player[]) ?? []);

    const { data: c } = await supabase
      .from('access_codes')
      .select('id, code, expires_at, is_active')
      .eq('tournament_id', params.id)
      .order('created_at', { ascending: false });
    setCodes((c as AccessCode[]) ?? []);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [params.id]);

  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    await supabase.from('tournaments').update({ status, ...extra }).eq('id', params.id);
    await loadData();
  };

  const generateCode = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Genereer code via Postgres functie
    const { data: codeData } = await supabase.rpc('generate_access_code');
    const code = codeData as string;

    await supabase.from('access_codes').insert({
      code,
      tournament_id: params.id,
      created_by: userData.user.id,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    await loadData();
  };

  const deactivateCode = async (codeId: string) => {
    await supabase.from('access_codes').update({ is_active: false }).eq('id', codeId);
    await loadData();
  };

  const addPlayer = async () => {
    if (!addPlayerName.trim()) return;
    await supabase.from('tournament_players').insert({
      tournament_id: params.id,
      name: addPlayerName.trim(),
      handicap: addPlayerHandicap ? parseFloat(addPlayerHandicap) : null,
      status: 'registered',
    });
    setAddPlayerName('');
    setAddPlayerHandicap('');
    await loadData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const leaderboardUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/nl/tournament/${params.id}`
    : '';

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft:    { label: 'Concept',    className: 'bg-gray-700 text-gray-300' },
    active:   { label: 'Actief',     className: 'bg-green-800 text-green-300' },
    paused:   { label: 'Gepauzeerd', className: 'bg-yellow-800 text-yellow-300' },
    finished: { label: 'Afgelopen',  className: 'bg-blue-900 text-blue-300' },
  };

  if (loading || !tournament) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </main>
    );
  }

  const sc = statusConfig[tournament.status] ?? statusConfig['draft']!;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/nl/dashboard" className="text-gray-400 hover:text-white text-sm">
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
              <p className="text-sm text-gray-400">
                {tournament.format} · {tournament.scoring_type === 'gross' ? 'Bruto' : 'Netto'}
                {tournament.start_date && ` · ${new Date(tournament.start_date).toLocaleDateString('nl-NL')}`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.className}`}>
              {sc.label}
            </span>
          </div>
        </div>
      </div>

      {/* Status acties */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
          {tournament.status === 'draft' && (
            <button
              onClick={() => updateStatus('active')}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
            >
              ▶ Toernooi starten
            </button>
          )}
          {tournament.status === 'active' && (
            <>
              <button
                onClick={() => setShowPauseModal(true)}
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg"
              >
                ⏸ Pauzeren
              </button>
              <button
                onClick={() => updateStatus('finished')}
                className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                ✓ Afsluiten
              </button>
            </>
          )}
          {tournament.status === 'paused' && (
            <button
              onClick={() => updateStatus('active', { pause_reason: null })}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
            >
              ▶ Hervatten
            </button>
          )}
          {tournament.status === 'finished' && (
            <button
              onClick={() => updateStatus('active')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg"
            >
              ↩ Heropenen
            </button>
          )}
          <Link
            href={`/nl/tournament/${params.id}`}
            target="_blank"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg"
          >
            👁 Leaderboard bekijken
          </Link>
          <button
            onClick={() => copyToClipboard(leaderboardUrl, 'url')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg"
          >
            {copied === 'url' ? '✅ Gekopieerd!' : '🔗 Link kopiëren'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4">
        <div className="max-w-4xl mx-auto flex gap-6">
          {(['overview', 'players', 'codes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {{ overview: 'Overzicht', players: `Spelers (${players.length})`, codes: 'Toegangscodes' }[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab: Overzicht */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Spelers', value: players.length },
                { label: 'Actief', value: players.filter(p => !['withdrawn','dns','dnf','dsq'].includes(p.status)).length },
                { label: 'Format', value: { stableford: 'Stableford', stroke: 'Stroke', match: 'Match' }[tournament.format] ?? tournament.format },
                { label: 'Rondes', value: tournament.rounds },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {tournament.status === 'paused' && tournament.pause_reason && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
                <p className="text-yellow-300 text-sm font-medium">⏸ Gepauzeerd</p>
                <p className="text-yellow-200 text-sm mt-1">{tournament.pause_reason}</p>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Leaderboard URL</p>
              <div className="flex items-center gap-2">
                <code className="text-green-400 text-xs flex-1 truncate">{leaderboardUrl}</code>
                <button
                  onClick={() => copyToClipboard(leaderboardUrl, 'url2')}
                  className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  {copied === 'url2' ? '✅' : 'Kopieer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Spelers */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {/* Speler toevoegen */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-3">Speler toevoegen</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addPlayerName}
                  onChange={(e) => setAddPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="Naam speler"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white
                             placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                />
                <input
                  type="number"
                  value={addPlayerHandicap}
                  onChange={(e) => setAddPlayerHandicap(e.target.value)}
                  placeholder="HCP"
                  className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white
                             placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                />
                <button
                  onClick={addPlayer}
                  disabled={!addPlayerName.trim()}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50
                             text-white text-sm font-medium rounded-lg"
                >
                  + Toevoegen
                </button>
              </div>
            </div>

            {/* Spelerslijst */}
            {players.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nog geen spelers toegevoegd.</p>
            ) : (
              <div className="space-y-2">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
                  >
                    <div>
                      <span className="text-white font-medium">{p.name}</span>
                      {p.handicap !== null && (
                        <span className="text-gray-400 text-sm ml-2">HCP {p.handicap}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Toegangscodes */}
        {activeTab === 'codes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">
                Codes geven recorders toegang zonder account. Geldig 24 uur.
              </p>
              <button
                onClick={generateCode}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
              >
                + Nieuwe code
              </button>
            </div>

            {codes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nog geen codes aangemaakt.</p>
            ) : (
              <div className="space-y-2">
                {codes.map((c) => {
                  const expired = new Date(c.expires_at) < new Date();
                  const valid = c.is_active && !expired;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between bg-gray-900 border rounded-xl px-4 py-3 ${
                        valid ? 'border-gray-800' : 'border-gray-800 opacity-50'
                      }`}
                    >
                      <div>
                        <code className={`text-lg font-mono font-bold tracking-widest ${valid ? 'text-green-400' : 'text-gray-500'}`}>
                          {c.code}
                        </code>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {expired ? 'Verlopen' : !c.is_active ? 'Gedeactiveerd' : `Geldig tot ${new Date(c.expires_at).toLocaleString('nl-NL')}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {valid && (
                          <button
                            onClick={() => copyToClipboard(c.code, c.id)}
                            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                          >
                            {copied === c.id ? '✅' : 'Kopieer'}
                          </button>
                        )}
                        {c.is_active && !expired && (
                          <button
                            onClick={() => deactivateCode(c.id)}
                            className="text-xs px-3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-300 rounded-lg"
                          >
                            Deactiveer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pauze modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Toernooi pauzeren</h3>
            <p className="text-gray-400 text-sm mb-4">
              Geef een reden op — deze wordt zichtbaar op het leaderboard.
            </p>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="bijv. Weersomstandigheden — hervatting om 14:30"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white
                         placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPauseModal(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl text-sm"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  updateStatus('paused', { pause_reason: pauseReason });
                  setShowPauseModal(false);
                }}
                className="flex-1 py-3 bg-yellow-700 hover:bg-yellow-600 text-white rounded-xl text-sm font-semibold"
              >
                Pauzeren
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
