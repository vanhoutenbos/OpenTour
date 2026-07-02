'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormatter } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { userError } from '@/lib/errors';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { LiveBadge } from '@/components/leaderboard/LiveBadge';
import { PauseBanner } from '@/components/leaderboard/PauseBanner';
import { clampRound, deriveActiveRound, normalizeActiveRound, type MatchplayMatch } from '@/components/leaderboard/matchplayUtils';
import ScoreGrid from '@/components/score-grid/ScoreGrid';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  course_id: string | null;
  format: string;
  scoring_type: string;
  rounds: number;
  status: string;
  start_date: string | null;
  pause_reason: string | null;
  is_public: boolean;
  created_by: string;
}

interface Player {
  id: string;
  name: string;
  handicap: number | null;
  gender: string | null;
  initials: string | null;
  call_name: string | null;
  prefix: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  street: string | null;
  house_number: string | null;
  house_number_addition: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  ngf_number: string | null;
  status: string;
  flight_id: string | null;
  category_id: string | null;
}

interface Hole {
  id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
}

interface AccessCode {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
}

interface Course {
  id: string;
  name: string;
  location: string | null;
}

interface Tee {
  id: string;
  name: string | null;
  color: string | null;
}

interface TournamentCategory {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
  handicap_min: number | null;
  handicap_max: number | null;
  tee_id: string | null;
  sort_order: number;
}

interface MatchplayPairingSummary {
  id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_name: string;
  player_b_name: string;
  round_number: number;
}

interface Flight {
  id: string;
  name: string | null;
  start_time: string | null;
  tee_number: number;
  category_id: string | null;
  max_players: number;
  sort_order?: number | null;
}

type Tab = 'overview' | 'edit' | 'players' | 'categories' | 'flights' | 'corrections' | 'codes';

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
      />
    </div>
  );
}

export default function ManageTournamentPage({ params }: { params: { id: string; locale: string } }) {
  const router = useRouter();
  const format = useFormatter();
  const supabase = getSupabaseBrowser();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [hasScores, setHasScores] = useState(false);
  const [overviewView, setOverviewView] = useState<'leaderboard' | 'startlist'>('leaderboard');
  const [matchplayPairings, setMatchplayPairings] = useState<MatchplayPairingSummary[]>([]);
  const [matchplayMatches, setMatchplayMatches] = useState<MatchplayMatch[]>([]);
  const [matchplayBusy, setMatchplayBusy] = useState(false);
  const [activeMatchplayRound, setActiveMatchplayRound] = useState(1);

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    course_id: '',
    format: 'stableford',
    scoring_type: 'gross',
    rounds: 1,
    start_date: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Add player
  const [playerForm, setPlayerForm] = useState({
    name: '', handicap: '', gender: '',
    initials: '', callName: '', prefix: '', lastName: '', dateOfBirth: '',
    street: '', houseNumber: '', houseNumberAddition: '',
    postalCode: '', city: '', country: 'Nederland',
    email: '', phone: '', ngfNumber: '',
  });
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  // Speler bewerken
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    name: '', handicap: '', gender: '',
    initials: '', callName: '', prefix: '', lastName: '', dateOfBirth: '',
    street: '', houseNumber: '', houseNumberAddition: '',
    postalCode: '', city: '', country: '',
    email: '', phone: '', ngfNumber: '',
  });
  const [playerSaving, setPlayerSaving] = useState(false);
  const [playerDeletingId, setPlayerDeletingId] = useState<string | null>(null);

  // Categories
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    gender: '',
    handicap_min: '',
    handicap_max: '',
    tee_id: '',
  });
  const [categorySaving, setCategorySaving] = useState(false);

  // Flight generation
  const [flightForm, setFlightForm] = useState({
    start_time: '',
    start_holes: [1, 10] as number[],
    interval_minutes: 8,
    max_players: 4,
  });
  const [flightGenerating, setFlightGenerating] = useState(false);
  const [flightDeleting, setFlightDeleting] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editingFlightName, setEditingFlightName] = useState('');
  const [showFlightSettings, setShowFlightSettings] = useState(false);
  const [showDeleteFlightsConfirm, setShowDeleteFlightsConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<'handicap_asc' | 'random'>('handicap_asc');
  const [splitByCategory, setSplitByCategory] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.replace('/nl/login'); return; }

    const { data: t } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', params.id)
      .eq('created_by', session.user.id)
      .single();

    if (!t) { router.replace('/nl/dashboard'); return; }
    setTournament(t as Tournament);
    setEditForm({
      name: t.name ?? '',
      description: t.description ?? '',
      course_id: t.course_id ?? '',
      format: t.format,
      scoring_type: t.scoring_type,
      rounds: t.rounds,
      start_date: t.start_date ? t.start_date.slice(0, 10) : '',
    });

    // Vul de starttijd voor in het flight-formulier vanuit de toernooistart
    if (t.start_date) {
      // datetime-local verwacht "YYYY-MM-DDTHH:MM"
      const dt = new Date(t.start_date);
      const local = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      setFlightForm(prev => prev.start_time ? prev : { ...prev, start_time: local });
    }

    const { data: p } = await supabase
      .from('tournament_players')
      .select('id, name, handicap, gender, initials, call_name, prefix, last_name, date_of_birth, street, house_number, house_number_addition, postal_code, city, country, email, phone, ngf_number, status, flight_id, category_id')
      .eq('tournament_id', params.id)
      .order('name');
    const playerRows = (p as Player[]) ?? [];
    setPlayers(playerRows);

    const { data: pairingRows } = await supabase
      .from('matchplay_pairings')
      .select('id, player_a_id, player_b_id, round_number')
      .eq('tournament_id', params.id)
      .order('created_at');
    const playerNameMap = new Map(playerRows.map((player) => [player.id, player.name]));
    setMatchplayPairings((pairingRows ?? []).map((pairing: { id: string; player_a_id: string; player_b_id: string; round_number: number | null }) => ({
      id: pairing.id,
      player_a_id: pairing.player_a_id,
      player_b_id: pairing.player_b_id,
      player_a_name: playerNameMap.get(pairing.player_a_id) ?? 'Onbekend',
      player_b_name: playerNameMap.get(pairing.player_b_id) ?? 'Onbekend',
      round_number: normalizeActiveRound(pairing.round_number, t.rounds || 1),
    })));

    const { data: standingsRows } = await supabase
      .from('matchplay_standings')
      .select('tournament_id, round_number, player_a_id, player_a_name, player_b_id, player_b_name, holes_won_a, holes_won_b, holes_halved, standing, holes_played, standing_text, hole_results')
      .eq('tournament_id', params.id)
      .order('round_number');
    setMatchplayMatches((standingsRows as MatchplayMatch[]) ?? []);

    const derivedRound = deriveActiveRound((standingsRows as MatchplayMatch[]) ?? [], t.rounds || 1);
    setActiveMatchplayRound(normalizeActiveRound(derivedRound, t.rounds || 1));

    const { data: c } = await supabase
      .from('access_codes')
      .select('id, code, expires_at, is_active')
      .eq('tournament_id', params.id)
      .order('created_at', { ascending: false });
    setCodes((c as AccessCode[]) ?? []);

    const { data: co } = await supabase
      .from('courses')
      .select('id, name, location')
      .order('name');
    setCourses((co as Course[]) ?? []);

    const { data: cat } = await supabase
      .from('tournament_categories')
      .select('*')
      .eq('tournament_id', params.id)
      .order('sort_order');
    setCategories((cat as TournamentCategory[]) ?? []);

    const { data: f } = await supabase
      .from('flights')
      .select('id, name, start_time, tee_number, category_id, max_players, sort_order')
      .eq('tournament_id', params.id)
      .order('start_time');
    setFlights((f as Flight[]) ?? []);

    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', params.id);
    setHasScores((count ?? 0) > 0);

    if (t.course_id) {
      const [teeData, holeData] = await Promise.all([
        supabase.from('tees').select('id, name, color').eq('course_id', t.course_id).order('name'),
        supabase.from('holes').select('id, number, par, stroke_index').eq('course_id', t.course_id).order('number'),
      ]);
      setTees((teeData.data as Tee[]) ?? []);
      setHoles((holeData.data as Hole[]) ?? []);
    }

    const hasScoreData = (count ?? 0) > 0;
    const showStartlist = t.status === 'draft' && !hasScoreData && (f ?? []).length > 0;
    setOverviewView(showStartlist ? 'startlist' : 'leaderboard');

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [params.id]);

  // ---- Tournament edit ----
  const saveEdit = async () => {
    setEditSaving(true);
    setEditSuccess(false);
    const { error } = await supabase.from('tournaments').update({
      name: editForm.name,
      description: editForm.description || null,
      course_id: editForm.course_id || null,
      format: editForm.format,
      scoring_type: editForm.scoring_type,
      rounds: editForm.rounds,
      start_date: editForm.start_date || null,
    }).eq('id', params.id);
    setEditSaving(false);
    if (!error) {
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2000);
      await loadData();
    }
  };

  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    await supabase.from('tournaments').update({ status, ...extra }).eq('id', params.id);
    await loadData();
  };

  // ---- Add player ----
  const addPlayer = async () => {
    if (!playerForm.name.trim()) return;
    const { data: inserted } = await supabase.from('tournament_players').insert({
      tournament_id: params.id,
      name: playerForm.name.trim(),
      handicap: playerForm.handicap ? parseFloat(playerForm.handicap) : null,
      gender: playerForm.gender || null,
      initials: playerForm.initials || null,
      call_name: playerForm.callName || null,
      prefix: playerForm.prefix || null,
      last_name: playerForm.lastName || null,
      date_of_birth: playerForm.dateOfBirth || null,
      street: playerForm.street || null,
      house_number: playerForm.houseNumber || null,
      house_number_addition: playerForm.houseNumberAddition || null,
      postal_code: playerForm.postalCode || null,
      city: playerForm.city || null,
      country: playerForm.country || null,
      email: playerForm.email || null,
      phone: playerForm.phone || null,
      ngf_number: playerForm.ngfNumber || null,
      status: 'registered',
    }).select('id, handicap, gender');

    if (inserted && inserted.length > 0) {
      const pl = inserted[0]!;
      await supabase.rpc('assign_player_category', {
        p_player_id: pl.id,
        p_handicap: pl.handicap ?? 0,
        p_gender: pl.gender ?? 'mixed',
      });
    }

    setPlayerForm({
      name: '', handicap: '', gender: '',
      initials: '', callName: '', prefix: '', lastName: '', dateOfBirth: '',
      street: '', houseNumber: '', houseNumberAddition: '',
      postalCode: '', city: '', country: 'Nederland',
      email: '', phone: '', ngfNumber: '',
    });
    setShowPlayerDetails(false);
    await loadData();
  };

  // ---- Speler bewerken ----
  const openPlayerEdit = (p: Player) => {
    setEditingPlayerId(p.id);
    setEditPlayerForm({
      name: p.name,
      handicap: p.handicap?.toString() ?? '',
      gender: p.gender ?? '',
      initials: p.initials ?? '',
      callName: p.call_name ?? '',
      prefix: p.prefix ?? '',
      lastName: p.last_name ?? '',
      dateOfBirth: p.date_of_birth ?? '',
      street: p.street ?? '',
      houseNumber: p.house_number ?? '',
      houseNumberAddition: p.house_number_addition ?? '',
      postalCode: p.postal_code ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      ngfNumber: p.ngf_number ?? '',
    });
  };

  const closePlayerEdit = () => setEditingPlayerId(null);

  const savePlayerEdit = async (playerId: string) => {
    if (!editPlayerForm.name.trim()) return;
    setPlayerSaving(true);

    const { error } = await supabase.from('tournament_players').update({
      name: editPlayerForm.name.trim(),
      handicap: editPlayerForm.handicap ? parseFloat(editPlayerForm.handicap) : null,
      gender: editPlayerForm.gender || null,
      initials: editPlayerForm.initials || null,
      call_name: editPlayerForm.callName || null,
      prefix: editPlayerForm.prefix || null,
      last_name: editPlayerForm.lastName || null,
      date_of_birth: editPlayerForm.dateOfBirth || null,
      street: editPlayerForm.street || null,
      house_number: editPlayerForm.houseNumber || null,
      house_number_addition: editPlayerForm.houseNumberAddition || null,
      postal_code: editPlayerForm.postalCode || null,
      city: editPlayerForm.city || null,
      country: editPlayerForm.country || null,
      email: editPlayerForm.email || null,
      phone: editPlayerForm.phone || null,
      ngf_number: editPlayerForm.ngfNumber || null,
    }).eq('id', playerId);

    setPlayerSaving(false);
    if (!error) {
      setEditingPlayerId(null);
      await loadData();
    }
  };

  const updatePlayerStatus = async (playerId: string, status: string) => {
    // Optimistische update voor directe feedback
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status } : p));
    const { error } = await supabase
      .from('tournament_players')
      .update({ status })
      .eq('id', playerId);
    if (error) {
      await loadData();
    }
  };

  const deletePlayer = async (playerId: string) => {
    setPlayerDeletingId(playerId);
    const { error } = await supabase.from('tournament_players').delete().eq('id', playerId);
    setPlayerDeletingId(null);
    if (!error) {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      if (editingPlayerId === playerId) setEditingPlayerId(null);
    }
  };

  // ---- Categories ----
  const openCategoryForm = (cat?: TournamentCategory) => {
    if (cat) {
      setEditingCategory(cat.id);
      setCategoryForm({
        name: cat.name,
        description: cat.description ?? '',
        gender: cat.gender ?? '',
        handicap_min: cat.handicap_min?.toString() ?? '',
        handicap_max: cat.handicap_max?.toString() ?? '',
        tee_id: cat.tee_id ?? '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', gender: '', handicap_min: '', handicap_max: '', tee_id: '' });
    }
    setShowCategoryForm(true);
  };

  const saveCategory = async () => {
    setCategorySaving(true);
    const payload = {
      tournament_id: params.id,
      name: categoryForm.name,
      description: categoryForm.description || null,
      gender: categoryForm.gender || null,
      handicap_min: categoryForm.handicap_min ? parseFloat(categoryForm.handicap_min) : null,
      handicap_max: categoryForm.handicap_max ? parseFloat(categoryForm.handicap_max) : null,
      tee_id: categoryForm.tee_id || null,
      sort_order: categories.length,
    };

    if (editingCategory) {
      await supabase.from('tournament_categories').update(payload).eq('id', editingCategory);
    } else {
      await supabase.from('tournament_categories').insert(payload);
    }
    setCategorySaving(false);
    setShowCategoryForm(false);
    await loadData();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('tournament_categories').delete().eq('id', id);
    await loadData();
  };

  // ---- Flights ----
  const generateFlights = async () => {
    if (!flightForm.start_time) return;
    setFlightGenerating(true);
    setFlightError(null);

    // Guard: velden kunnen tijdelijk 0 zijn tijdens het typen (leeg veld).
    // Val terug op geldige defaults als generate wordt aangeroepen vóórdat onBlur clamt.
    const safeMaxPlayers = flightForm.max_players > 0 ? Math.min(4, flightForm.max_players) : 4;
    const safeIntervalMinutes = flightForm.interval_minutes > 0 ? Math.min(30, flightForm.interval_minutes) : 8;

    // Stap 1: Ontkoppel spelers van flights (FK constraint, moet vóór DELETE)
    const { error: updateErr } = await supabase
      .from('tournament_players')
      .update({ flight_id: null })
      .eq('tournament_id', params.id);
    if (updateErr) { setFlightError(userError(updateErr, 'Kon spelers niet ontkoppelen van bestaande flights.')); setFlightGenerating(false); return; }

    // Stap 2: Verwijder alle bestaande flights (nu veilig, FK is ontkoppeld)
    const { error: deleteErr } = await supabase
      .from('flights')
      .delete()
      .eq('tournament_id', params.id);
    if (deleteErr) { setFlightError(userError(deleteErr, 'Kon bestaande flights niet verwijderen.')); setFlightGenerating(false); return; }

    // Stap 3: Ken categorieën toe als er op categorie gesplitst wordt
    if (splitByCategory) {
      const unassigned = players.filter(p => !p.category_id);
      for (const pl of unassigned) {
        const { error: catErr } = await supabase.rpc('assign_player_category', {
          p_player_id: pl.id,
          p_handicap: pl.handicap ?? 0,
          p_gender: pl.gender ?? 'mixed',
        });
        if (catErr) { setFlightError(userError(catErr, 'Kon categorie niet toewijzen aan speler.')); setFlightGenerating(false); return; }
      }
    }

    // Stap 4: Genereer nieuwe flights via RPC
    const { error } = await supabase.rpc('generate_flights', {
      p_tournament_id: params.id,
      p_start_time: new Date(flightForm.start_time).toISOString(),
      p_start_holes: flightForm.start_holes,
      p_interval_minutes: safeIntervalMinutes,
      p_max_players_per_flight: safeMaxPlayers,
      p_sort_by: sortBy,
      p_split_by_category: splitByCategory,
    });
    if (error) {
      setFlightError(userError(error, 'Kon geen flights genereren. Controleer de instellingen en probeer het opnieuw.'));
    } else {
      await loadData();
    }
    setFlightGenerating(false);
  };

  const deleteAllFlights = async () => {
    const { error: updateErr } = await supabase
      .from('tournament_players')
      .update({ flight_id: null })
      .eq('tournament_id', params.id);
    console.log('[deleteAllFlights] update tournament_players:', updateErr);
    if (updateErr) { setFlightError(userError(updateErr, 'Kon spelers niet ontkoppelen van flights.')); return; }

    const { error: deleteErr, count } = await supabase
      .from('flights')
      .delete({ count: 'exact' })
      .eq('tournament_id', params.id);
    console.log('[deleteAllFlights] delete flights:', deleteErr, 'count:', count);
    if (deleteErr) { setFlightError(userError(deleteErr, 'Kon flights niet verwijderen.')); return; }

    await loadData();
  };

  const handleDeleteFlightsConfirm = async () => {
    setShowDeleteFlightsConfirm(false);
    setFlightDeleting(true);
    try {
      await deleteAllFlights();
    } finally {
      setFlightDeleting(false);
    }
  };

  const startHoleOptions = [1, 10];
  const toggleStartHole = (hole: number) => {
    setFlightForm(prev => ({
      ...prev,
      start_holes: prev.start_holes.includes(hole)
        ? prev.start_holes.filter(h => h !== hole)
        : [...prev.start_holes, hole].sort(),
    }));
  };

  // ---- Flight drag & drop / DNS ----
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, flightId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;
    setDraggedPlayerId(null);
    const { error } = await supabase.from('tournament_players').update({ flight_id: flightId }).eq('id', playerId);
    if (!error) await loadData();
  };

  const removePlayerFromFlight = async (playerId: string) => {
    await supabase.from('tournament_players').update({ flight_id: null }).eq('id', playerId);
    await loadData();
  };

  // ---- Matchplay pairings ----
  const generateMatchplayPairings = async () => {
    if (!tournament || tournament.format !== 'match') return;

    setMatchplayBusy(true);
    const activePlayers = players
      .filter((player) => !['withdrawn', 'dns', 'dnf', 'dsq'].includes(player.status));

    if (activePlayers.length < 2) {
      setMatchplayBusy(false);
      return;
    }

    const playersByFlight = new Map<string | null, Player[]>();
    activePlayers.forEach((player) => {
      const key = player.flight_id ?? null;
      const group = playersByFlight.get(key) ?? [];
      group.push(player);
      playersByFlight.set(key, group);
    });

    const pairings = [] as Array<{ tournament_id: string; player_a_id: string; player_b_id: string; flight_id: string | null; round_number: number }>;
    Array.from(playersByFlight.values()).forEach((flightPlayers) => {
      const sortedPlayers = [...flightPlayers].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
      const playersForPairings = sortedPlayers.filter((player) => !['withdrawn', 'dns', 'dnf', 'dsq'].includes(player.status));
      for (let index = 0; index < playersForPairings.length - (playersForPairings.length % 2); index += 2) {
        pairings.push({
          tournament_id: params.id,
          player_a_id: playersForPairings[index]!.id,
          player_b_id: playersForPairings[index + 1]!.id,
          flight_id: playersForPairings[index]!.flight_id ?? null,
          round_number: 1,
        });
      }
    });

    await supabase.from('matchplay_pairings').delete().eq('tournament_id', params.id);
    if (pairings.length > 0) {
      await supabase.from('matchplay_pairings').insert(pairings);
    }

    await loadData();
    setMatchplayBusy(false);
  };

  const clearMatchplayPairings = async () => {
    setMatchplayBusy(true);
    await supabase.from('matchplay_pairings').delete().eq('tournament_id', params.id);
    await loadData();
    setMatchplayBusy(false);
  };

  const updateMatchplayPairingRound = async (pairingId: string, nextRound: number) => {
    const safeRound = normalizeActiveRound(nextRound, tournament?.rounds ?? 1);
    setMatchplayPairings(prev => prev.map((pairing) => pairing.id === pairingId ? { ...pairing, round_number: safeRound } : pairing));
    await supabase.from('matchplay_pairings').update({ round_number: safeRound }).eq('id', pairingId);
  };

  const updateActiveMatchplayRound = async (nextRound: number) => {
    const safeRound = normalizeActiveRound(nextRound, tournament?.rounds ?? 1);
    setActiveMatchplayRound(safeRound);
    await supabase.from('tournaments').update({ rounds: tournament?.rounds ?? safeRound }).eq('id', params.id);
    await loadData();
  };

  const advanceMatchplayRound = async () => {
    if (!tournament) return;
    const nextRound = deriveActiveRound(matchplayMatches, tournament.rounds ?? 1);
    const safeRound = normalizeActiveRound(nextRound, tournament.rounds ?? 1);
    setActiveMatchplayRound(safeRound);
    await loadData();
  };

  // ---- Codes ----
  const generateCode = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
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

  const genderLabel = (g: string | null) =>
    g === 'male' ? 'Man' : g === 'female' ? 'Vrouw' : '';

  const teeLabel = (teeId: string | null) => {
    const t = tees.find(tee => tee.id === teeId);
    return t ? `${t.color ?? ''} ${t.name ?? ''}`.trim() || 'Onbekende tee' : 'Niet gekozen';
  };

  if (loading || !tournament) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </main>
    );
  }

  const sc = statusConfig[tournament.status] ?? statusConfig['draft']!;
  const courseName = courses.find(c => c.id === tournament.course_id)?.name ?? 'Niet gekozen';

  const flightLabel = (f: { name: string | null; start_time: string | null; tee_number: number | null; sort_order?: number | null }, index?: number) => {
    if (f.name?.trim()) return f.name.trim();
    const parts: string[] = [];
    if (f.start_time) parts.push(new Date(f.start_time).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    if (f.tee_number) parts.push(`Hole ${f.tee_number}`);
    if (parts.length) return parts.join(' · ');
    return `Flight ${f.sort_order ?? (index ?? 0) + 1}`;
  };

  const saveFlightName = async (flightId: string) => {
    const trimmed = editingFlightName.trim();
    await supabase.from('flights').update({ name: trimmed || null }).eq('id', flightId);
    setFlights(prev => prev.map(f => f.id === flightId ? { ...f, name: trimmed || null } : f));
    setEditingFlightId(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overzicht' },
    { key: 'edit', label: 'Bewerken' },
    { key: 'players', label: `Spelers (${players.length})` },
    { key: 'categories', label: `Categorieën (${categories.length})` },
    { key: 'flights', label: `Flights (${flights.length})` },
    { key: 'corrections', label: 'Scorecorrecties' },
    { key: 'codes', label: 'Toegangscodes' },
  ];

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
                {courseName} · {tournament.format} · {tournament.scoring_type === 'gross' ? 'Bruto' : 'Netto'}
                {tournament.start_date && ` · ${format.dateTime(new Date(tournament.start_date), { day: 'numeric', month: 'short', year: 'numeric' })}`}
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
            👁 Leaderboard
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
      <div className="border-b border-gray-800 px-4 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-4 min-w-max">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ===== TAB: Overzicht ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Spelers', value: players.length },
                { label: 'Actief', value: players.filter(p => !['withdrawn','dns','dnf','dsq'].includes(p.status)).length },
                { label: 'Categorieën', value: categories.length },
                { label: 'Flights', value: flights.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Pause banner */}
            {tournament.status === 'paused' && tournament.pause_reason && (
              <PauseBanner reason={tournament.pause_reason} />
            )}

            {tournament.format === 'match' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Matchplay flow</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Genereer de eerste 1-op-1 paringen voor het toernooi. Zodra scores per hole zijn ingevoerd, verschijnt de stand direct op het publieke leaderboard.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={generateMatchplayPairings}
                      disabled={matchplayBusy}
                      className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                    >
                      {matchplayBusy ? 'Bezig...' : 'Genereer paringen'}
                    </button>
                    <button
                      onClick={clearMatchplayPairings}
                      disabled={matchplayBusy}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                    >
                      Wis paringen
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-3">
                  <label className="text-sm text-gray-400">Actieve ronde</label>
                  <input
                    type="number"
                    min={1}
                    max={tournament.rounds}
                    value={activeMatchplayRound}
                    onChange={(event) => setActiveMatchplayRound(Number(event.target.value) || 1)}
                    className="w-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => updateActiveMatchplayRound(activeMatchplayRound)}
                    className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Opslaan ronde
                  </button>
                  <button
                    onClick={advanceMatchplayRound}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                  >
                    Volgende ronde
                  </button>
                  <span className="text-sm text-gray-500">Ronde wordt automatisch doorgeschoven zodra alle duels in de actieve ronde zijn afgerond.</span>
                </div>

                {matchplayPairings.length === 0 ? (
                  <p className="text-sm text-gray-500">Nog geen paringen aangemaakt. Gebruik de knop hierboven om de eerste bracket op te bouwen.</p>
                ) : (
                  <div className="space-y-2">
                    {matchplayPairings.map((pairing, index) => (
                      <div key={pairing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-white">{index + 1}. {pairing.player_a_name} vs {pairing.player_b_name}</p>
                          <p className="text-xs text-gray-500">live zodra scores binnenkomen</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Ronde</label>
                          <select
                            value={pairing.round_number}
                            onChange={(event) => updateMatchplayPairingRound(pairing.id, Number(event.target.value) || 1)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-sm text-white"
                          >
                            {Array.from({ length: tournament.rounds }, (_, roundIndex) => roundIndex + 1).map((roundNumber) => (
                              <option key={roundNumber} value={roundNumber}>
                                {roundNumber}
                              </option>
                            ))}
                          </select>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                            Duel
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {flights.length > 0 ? (
              <>
                {/* Sub-tabs: Leaderboard / Startlijst */}
                <div className="flex gap-1 border-b border-gray-800">
                  <button
                    onClick={() => setOverviewView('leaderboard')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      overviewView === 'leaderboard'
                        ? 'border-green-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => setOverviewView('startlist')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      overviewView === 'startlist'
                        ? 'border-green-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Startlijst
                  </button>
                </div>

                {/* Leaderboard content */}
                {overviewView === 'leaderboard' && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-white">Leaderboard</h2>
                      {tournament.status === 'active' && <LiveBadge />}
                    </div>
                    <LeaderboardClient
                      tournamentId={params.id}
                      tournamentName={tournament.name}
                      activeMatchplayRound={activeMatchplayRound}
                      format={tournament.format}
                      scoringType={tournament.scoring_type}
                      isActive={tournament.status === 'active'}
                      status={tournament.status}
                      rounds={tournament.rounds}
                      flightCount={flights.length}
                      hideExtras
                    />
                    <div className="mt-4 text-center">
                      <Link
                        href={`/nl/tournament/${params.id}`}
                        target="_blank"
                        className="text-sm text-green-500 hover:text-green-400 transition-colors"
                      >
                        Volledig leaderboard bekijken →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Startlijst content */}
                {overviewView === 'startlist' && (
                  <div className="space-y-4">
                    {flights.map((f) => {
                      const catName = categories.find(c => c.id === f.category_id)?.name;
                      const playersInFlight = players.filter(p => p.flight_id === f.id);
                      return (
                        <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              {f.name?.trim() && (
                                <h4 className="text-white font-semibold text-sm">{f.name}</h4>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5">
                                {f.start_time && format.dateTime(new Date(f.start_time), { hour: '2-digit', minute: '2-digit' })}
                                {f.tee_number && ` · Hole ${f.tee_number}`}
                                {catName && ` · ${catName}`}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">{playersInFlight.length} spelers</span>
                          </div>
                          <div className="space-y-1">
                            {playersInFlight.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">Geen spelers</p>
                            ) : (
                              playersInFlight.map(pl => (
                                <div key={pl.id} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white">{pl.name}</span>
                                    {pl.handicap !== null && (
                                      <span className="text-gray-500 text-xs">HCP {pl.handicap}</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {pl.gender === 'male' ? 'M' : pl.gender === 'female' ? 'V' : ''}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* No flights: show leaderboard only */
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Leaderboard</h2>
                  {tournament.status === 'active' && <LiveBadge />}
                </div>
                <LeaderboardClient
                  tournamentId={params.id}
                  tournamentName={tournament.name}
                  activeMatchplayRound={activeMatchplayRound}
                  format={tournament.format}
                  scoringType={tournament.scoring_type}
                  isActive={tournament.status === 'active'}
                  status={tournament.status}
                  rounds={tournament.rounds}
                  hideExtras
                />
                {tournament.status === 'draft' && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setActiveTab('flights')}
                      className="text-sm text-green-500 hover:text-green-400 transition-colors"
                    >
                      Genereer flights om de startlijst te tonen →
                    </button>
                  </div>
                )}
                <div className="mt-4 text-center">
                  <Link
                    href={`/nl/tournament/${params.id}`}
                    target="_blank"
                    className="text-sm text-green-500 hover:text-green-400 transition-colors"
                  >
                    Volledig leaderboard bekijken →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Bewerken ===== */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Toernooi bewerken</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Naam</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Beschrijving</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-600 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Datum</label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Aantal rondes</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={editForm.rounds}
                      onChange={e => setEditForm(f => ({ ...f, rounds: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Golfbaan</label>
                  <select
                    value={editForm.course_id}
                    onChange={e => setEditForm(f => ({ ...f, course_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                  >
                    <option value="">Nog niet gekozen</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Format</label>
                    <select
                      value={editForm.format}
                      onChange={e => setEditForm(f => ({ ...f, format: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                    >
                      <option value="stableford">Stableford</option>
                      <option value="stroke">Stroke play</option>
                      <option value="match">Matchplay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Scoring</label>
                    <select
                      value={editForm.scoring_type}
                      onChange={e => setEditForm(f => ({ ...f, scoring_type: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                    >
                      <option value="gross">Bruto</option>
                      <option value="net">Netto</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={saveEdit}
                  disabled={editSaving || !editForm.name.trim()}
                  className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {editSaving ? 'Opslaan...' : editSuccess ? '✓ Opgeslagen!' : 'Wijzigingen opslaan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: Spelers ===== */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-3">Speler toevoegen</h3>

              {/* Required fields row */}
              <div className="flex flex-wrap gap-2 mb-3">
                <input
                  type="text"
                  value={playerForm.name}
                  onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && !showPlayerDetails && addPlayer()}
                  placeholder="Naam *"
                  className="flex-1 min-w-[160px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                />
                <input
                  type="number"
                  value={playerForm.handicap}
                  onChange={e => setPlayerForm(f => ({ ...f, handicap: e.target.value }))}
                  placeholder="HCP *"
                  className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                />
                <select
                  value={playerForm.gender}
                  onChange={e => setPlayerForm(f => ({ ...f, gender: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-600"
                >
                  <option value="">Geslacht</option>
                  <option value="male">Man</option>
                  <option value="female">Vrouw</option>
                  <option value="unknown">Onbekend</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPlayerDetails(!showPlayerDetails)}
                    className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                      showPlayerDetails
                        ? 'border-green-600 text-green-400 bg-green-900/20'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {showPlayerDetails ? '− Details' : '+ Details'}
                  </button>
                  <button
                    onClick={addPlayer}
                    disabled={!playerForm.name.trim()}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    + Toevoegen
                  </button>
                </div>
              </div>

              {/* Expandable details section */}
              {showPlayerDetails && (
                <div className="border-t border-gray-800 pt-4 mt-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InputField label="Voorletters" value={playerForm.initials} onChange={v => setPlayerForm(f => ({ ...f, initials: v }))} />
                    <InputField label="Roepnaam" value={playerForm.callName} onChange={v => setPlayerForm(f => ({ ...f, callName: v }))} />
                    <InputField label="Tussenvoegsel" value={playerForm.prefix} onChange={v => setPlayerForm(f => ({ ...f, prefix: v }))} />
                    <InputField label="Achternaam" value={playerForm.lastName} onChange={v => setPlayerForm(f => ({ ...f, lastName: v }))} />
                    <InputField label="Geboortedatum" type="date" value={playerForm.dateOfBirth} onChange={v => setPlayerForm(f => ({ ...f, dateOfBirth: v }))} />
                    <InputField label="E-mailadres" type="email" value={playerForm.email} onChange={v => setPlayerForm(f => ({ ...f, email: v }))} />
                    <InputField label="Mobiel" value={playerForm.phone} onChange={v => setPlayerForm(f => ({ ...f, phone: v }))} />
                    <InputField label="NGF nummer" value={playerForm.ngfNumber} onChange={v => setPlayerForm(f => ({ ...f, ngfNumber: v }))} />
                  </div>
                  <div className="border-t border-gray-800 pt-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Adres</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <InputField label="Straat" value={playerForm.street} onChange={v => setPlayerForm(f => ({ ...f, street: v }))} />
                      <InputField label="Huisnummer" value={playerForm.houseNumber} onChange={v => setPlayerForm(f => ({ ...f, houseNumber: v }))} />
                      <InputField label="Toevoeging" value={playerForm.houseNumberAddition} onChange={v => setPlayerForm(f => ({ ...f, houseNumberAddition: v }))} />
                      <InputField label="Postcode" value={playerForm.postalCode} onChange={v => setPlayerForm(f => ({ ...f, postalCode: v }))} />
                      <InputField label="Plaats" value={playerForm.city} onChange={v => setPlayerForm(f => ({ ...f, city: v }))} />
                      <InputField label="Land" value={playerForm.country} onChange={v => setPlayerForm(f => ({ ...f, country: v }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {players.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nog geen spelers toegevoegd.</p>
            ) : (
              <div className="space-y-2">
                {players.map((p) => {
                  const isEditing = editingPlayerId === p.id;
                  const statusConfig: Record<string, { label: string; color: string }> = {
                    registered: { label: 'Aangemeld',    color: 'bg-gray-700 text-gray-300' },
                    confirmed:  { label: 'Bevestigd',    color: 'bg-blue-900/40 text-blue-300' },
                    dns:        { label: 'DNS',          color: 'bg-yellow-900/40 text-yellow-300' },
                    dnf:        { label: 'DNF',          color: 'bg-orange-900/40 text-orange-300' },
                    dsq:        { label: 'DSQ',          color: 'bg-red-900/40 text-red-300' },
                  };
                  const sc = statusConfig[p.status] ?? statusConfig.registered!;

                  return (
                    <div
                      key={p.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                    >
                      {/* Samengevouwen rij — klik om te bewerken */}
                      <button
                        onClick={() => isEditing ? closePlayerEdit() : openPlayerEdit(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-850 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-medium truncate">{p.name}</span>
                          {p.handicap !== null && (
                            <span className="text-gray-400 text-sm shrink-0">HCP {p.handicap}</span>
                          )}
                          {p.gender && (
                            <span className="text-gray-500 text-sm shrink-0">({genderLabel(p.gender)})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {p.category_id && (
                            <span className="text-xs text-green-400 hidden sm:inline">
                              {categories.find(c => c.id === p.category_id)?.name ?? ''}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                            {sc.label}
                          </span>
                          <span className={`text-gray-500 transition-transform ${isEditing ? 'rotate-180' : ''}`}>▾</span>
                        </div>
                      </button>

                      {/* Uitgeklapt bewerkpaneel */}
                      {isEditing && (
                        <div className="border-t border-gray-800 px-4 py-4 space-y-4">

                          {/* Status snelkeuze */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                            <div className="flex flex-wrap gap-1.5">
                              {(['registered', 'confirmed', 'dns', 'dnf', 'dsq', 'withdrawn'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => updatePlayerStatus(p.id, s)}
                                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                                    p.status === s
                                      ? statusConfig[s]!.color + ' ring-1 ring-inset ring-current'
                                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                  }`}
                                >
                                  {statusConfig[s]!.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Basisvelden */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <InputField label="Naam *" value={editPlayerForm.name} onChange={v => setEditPlayerForm(f => ({ ...f, name: v }))} />
                            <InputField label="Handicap" type="number" value={editPlayerForm.handicap} onChange={v => setEditPlayerForm(f => ({ ...f, handicap: v }))} />
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Geslacht</label>
                              <select
                                value={editPlayerForm.gender}
                                onChange={e => setEditPlayerForm(f => ({ ...f, gender: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-600"
                              >
                                <option value="">Onbekend</option>
                                <option value="male">Man</option>
                                <option value="female">Vrouw</option>
                                <option value="unknown">Onbekend</option>
                              </select>
                            </div>
                            <InputField label="Voorletters" value={editPlayerForm.initials} onChange={v => setEditPlayerForm(f => ({ ...f, initials: v }))} />
                            <InputField label="Roepnaam" value={editPlayerForm.callName} onChange={v => setEditPlayerForm(f => ({ ...f, callName: v }))} />
                            <InputField label="Tussenvoegsel" value={editPlayerForm.prefix} onChange={v => setEditPlayerForm(f => ({ ...f, prefix: v }))} />
                            <InputField label="Achternaam" value={editPlayerForm.lastName} onChange={v => setEditPlayerForm(f => ({ ...f, lastName: v }))} />
                            <InputField label="Geboortedatum" type="date" value={editPlayerForm.dateOfBirth} onChange={v => setEditPlayerForm(f => ({ ...f, dateOfBirth: v }))} />
                            <InputField label="E-mailadres" type="email" value={editPlayerForm.email} onChange={v => setEditPlayerForm(f => ({ ...f, email: v }))} />
                            <InputField label="Mobiel" value={editPlayerForm.phone} onChange={v => setEditPlayerForm(f => ({ ...f, phone: v }))} />
                            <InputField label="NGF nummer" value={editPlayerForm.ngfNumber} onChange={v => setEditPlayerForm(f => ({ ...f, ngfNumber: v }))} />
                          </div>

                          {/* Adres */}
                          <div className="border-t border-gray-800 pt-3">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Adres</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <InputField label="Straat" value={editPlayerForm.street} onChange={v => setEditPlayerForm(f => ({ ...f, street: v }))} />
                              <InputField label="Huisnummer" value={editPlayerForm.houseNumber} onChange={v => setEditPlayerForm(f => ({ ...f, houseNumber: v }))} />
                              <InputField label="Toevoeging" value={editPlayerForm.houseNumberAddition} onChange={v => setEditPlayerForm(f => ({ ...f, houseNumberAddition: v }))} />
                              <InputField label="Postcode" value={editPlayerForm.postalCode} onChange={v => setEditPlayerForm(f => ({ ...f, postalCode: v }))} />
                              <InputField label="Plaats" value={editPlayerForm.city} onChange={v => setEditPlayerForm(f => ({ ...f, city: v }))} />
                              <InputField label="Land" value={editPlayerForm.country} onChange={v => setEditPlayerForm(f => ({ ...f, country: v }))} />
                            </div>
                          </div>

                          {/* Acties */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                            <button
                              onClick={() => {
                                if (confirm(`Weet je zeker dat je ${p.name} wilt verwijderen?`)) {
                                  deletePlayer(p.id);
                                }
                              }}
                              disabled={playerDeletingId === p.id}
                              className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 px-3 py-2"
                            >
                              {playerDeletingId === p.id ? 'Verwijderen...' : '🗑 Speler verwijderen'}
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={closePlayerEdit}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                              >
                                Annuleren
                              </button>
                              <button
                                onClick={() => savePlayerEdit(p.id)}
                                disabled={playerSaving || !editPlayerForm.name.trim()}
                                className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                              >
                                {playerSaving ? 'Opslaan...' : 'Opslaan'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Categorieën ===== */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">
                Categorieën bepalen hoe spelers worden gegroepeerd (bijv. geslacht, handicap).
                Elke categorie is gekoppeld aan een tee-box.
              </p>
              <button
                onClick={() => openCategoryForm()}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg shrink-0"
              >
                + Nieuwe categorie
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nog geen categorieën aangemaakt.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-white font-medium">{cat.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[genderLabel(cat.gender), cat.handicap_min !== null ? `HCP ≥ ${cat.handicap_min}` : '', cat.handicap_max !== null ? `HCP ≤ ${cat.handicap_max}` : ''].filter(Boolean).join(' · ') || 'Alle spelers'}
                        {cat.tee_id && ` · Tee: ${teeLabel(cat.tee_id)}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCategoryForm(cat)}
                        className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                      >
                        Bewerk
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-xs px-3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-300 rounded-lg"
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Category modal */}
            {showCategoryForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {editingCategory ? 'Categorie bewerken' : 'Nieuwe categorie'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Naam *</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="bijv. Heren, Dames"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Omschrijving</label>
                      <input
                        type="text"
                        value={categoryForm.description}
                        onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Optionele omschrijving"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Geslacht</label>
                      <select
                        value={categoryForm.gender}
                        onChange={e => setCategoryForm(f => ({ ...f, gender: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                      >
                        <option value="">Alle geslachten</option>
                        <option value="male">Man</option>
                        <option value="female">Vrouw</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">HCP min</label>
                        <input
                          type="number"
                          value={categoryForm.handicap_min}
                          onChange={e => setCategoryForm(f => ({ ...f, handicap_min: e.target.value }))}
                          placeholder="Geen min"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">HCP max</label>
                        <input
                          type="number"
                          value={categoryForm.handicap_max}
                          onChange={e => setCategoryForm(f => ({ ...f, handicap_max: e.target.value }))}
                          placeholder="Geen max"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Tee-box</label>
                      <select
                        value={categoryForm.tee_id}
                        onChange={e => setCategoryForm(f => ({ ...f, tee_id: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                      >
                        <option value="">Niet gekozen</option>
                        {tees.map(tee => (
                          <option key={tee.id} value={tee.id}>
                            {tee.color ?? ''} {tee.name ?? ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setShowCategoryForm(false)}
                      className="flex-1 py-3 bg-gray-700 text-white rounded-xl text-sm"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={saveCategory}
                      disabled={categorySaving || !categoryForm.name.trim()}
                      className="flex-1 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
                    >
                      {categorySaving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Flights ===== */}
        {activeTab === 'flights' && (
          <div className="space-y-4">
            {categories.length === 0 ? (
              /* Geen categorieën: toon informatief leeg scherm */
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
                <span className="text-5xl">🗂️</span>
                <h3 className="text-lg font-semibold text-white mt-4 mb-2">Maak eerst categorieën aan</h3>
                <p className="text-gray-400 text-sm mb-1 max-w-xs mx-auto">
                  Flights worden gegenereerd op basis van categorieën, zoals Heren, Dames of handicapklassen.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Ga naar het tabblad <span className="text-gray-300 font-medium">Categorieën</span> om te beginnen.
                </p>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Categorieën aanmaken →
                </button>
              </div>
            ) : (
              <>
                {flights.length > 0 ? (
                  <>
                    {/* Simpel menu als er al flights zijn */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-white">Flights beheren</h3>
                        <button
                          onClick={() => setShowFlightSettings(true)}
                          title="Instellingen wijzigen"
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={generateFlights}
                          disabled={flightGenerating || !flightForm.start_time}
                          className="py-2 px-4 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                        >
                          {flightGenerating ? 'Genereren...' : 'Flights her-genereren'}
                        </button>
                        <button
                          onClick={() => setShowDeleteFlightsConfirm(true)}
                          disabled={flightDeleting}
                          className="py-2 px-4 bg-red-900/40 hover:bg-red-900 disabled:opacity-50 text-red-300 rounded-xl text-sm"
                        >
                          {flightDeleting ? 'Verwijderen...' : 'Alle flights verwijderen'}
                        </button>
                      </div>
                    </div>
                    {flightError && (
                      <p className="text-red-400 text-sm">{flightError}</p>
                )}

                {showDeleteFlightsConfirm && (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Weet je het zeker?</h3>
                        <p className="text-sm text-gray-400 mt-2">
                          Dit verwijdert alle bestaande flights en ontkoppelt spelers van hun flight. Deze actie kan niet ongedaan worden gemaakt.
                        </p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowDeleteFlightsConfirm(false)}
                          className="flex-1 py-3 bg-gray-700 text-white rounded-xl text-sm"
                        >
                          Annuleren
                        </button>
                        <button
                          onClick={handleDeleteFlightsConfirm}
                          disabled={flightDeleting}
                          className="flex-1 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
                        >
                          {flightDeleting ? 'Verwijderen...' : 'Ja, verwijderen'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </>
                ) : (
                  <>
                    {/* Flight generator form (geen flights) */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-white mb-3">
                        Flights genereren
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Starttijd *</label>
                          <input
                            type="datetime-local"
                            value={flightForm.start_time}
                            onChange={e => setFlightForm(f => ({ ...f, start_time: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Minuten tussen flights</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={flightForm.interval_minutes === 0 ? '' : flightForm.interval_minutes}
                            onChange={e => {
                              const raw = e.target.value;
                              setFlightForm(f => ({ ...f, interval_minutes: raw === '' ? 0 : (parseInt(raw) || 0) }));
                            }}
                            onBlur={e => {
                              const parsed = parseInt(e.target.value);
                              const clamped = Number.isNaN(parsed) ? 8 : Math.min(30, Math.max(1, parsed));
                              setFlightForm(f => ({ ...f, interval_minutes: clamped }));
                            }}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Max spelers per flight</label>
                          <input
                            type="number"
                            min={1}
                            max={4}
                            value={flightForm.max_players === 0 ? '' : flightForm.max_players}
                            onChange={e => {
                              const raw = e.target.value;
                              setFlightForm(f => ({ ...f, max_players: raw === '' ? 0 : (parseInt(raw) || 0) }));
                            }}
                            onBlur={e => {
                              const parsed = parseInt(e.target.value);
                              const clamped = Number.isNaN(parsed) ? 4 : Math.min(4, Math.max(1, parsed));
                              setFlightForm(f => ({ ...f, max_players: clamped }));
                            }}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Startholes</label>
                          <div className="flex gap-3 pt-1">
                            {startHoleOptions.map(hole => (
                              <label key={hole} className="flex items-center gap-2 cursor-pointer">
                                <button
                                  type="button"
                                  onClick={() => toggleStartHole(hole)}
                                  className={`w-10 h-10 rounded-xl border-2 transition-colors font-medium text-sm ${
                                    flightForm.start_holes.includes(hole)
                                      ? 'bg-green-900/30 border-green-600 text-green-400'
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                  }`}
                                >
                                  {hole}
                                </button>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Sorteer op</label>
                          <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as 'handicap_asc' | 'random')}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                          >
                            <option value="handicap_asc">Handicap laag → hoog</option>
                            <option value="random">Willekeurig</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Indeling</label>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSplitByCategory(false)}
                              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                                !splitByCategory
                                  ? 'bg-green-900/30 border-green-600 text-green-400'
                                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              Gemengde categorieen
                            </button>
                            <button
                              type="button"
                              onClick={() => setSplitByCategory(true)}
                              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                                splitByCategory
                                  ? 'bg-green-900/30 border-green-600 text-green-400'
                                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              Per categorie
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={generateFlights}
                          disabled={flightGenerating || !flightForm.start_time}
                          className="flex-1 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                        >
                          {flightGenerating ? 'Genereren...' : 'Flights genereren'}
                        </button>
                      </div>
                      {flightError && (
                        <p className="text-red-400 text-sm mt-3">{flightError}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Flight settings modal */}
                {showFlightSettings && (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                      <h3 className="text-lg font-semibold text-white">Flight instellingen</h3>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Starttijd *</label>
                        <input
                          type="datetime-local"
                          value={flightForm.start_time}
                          onChange={e => setFlightForm(f => ({ ...f, start_time: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Minuten tussen flights</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={flightForm.interval_minutes === 0 ? '' : flightForm.interval_minutes}
                            onChange={e => {
                              const raw = e.target.value;
                              setFlightForm(f => ({ ...f, interval_minutes: raw === '' ? 0 : (parseInt(raw) || 0) }));
                            }}
                            onBlur={e => {
                              const parsed = parseInt(e.target.value);
                              const clamped = Number.isNaN(parsed) ? 8 : Math.min(30, Math.max(1, parsed));
                              setFlightForm(f => ({ ...f, interval_minutes: clamped }));
                            }}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Max spelers per flight</label>
                          <input
                            type="number"
                            min={1}
                            max={4}
                            value={flightForm.max_players === 0 ? '' : flightForm.max_players}
                            onChange={e => {
                              const raw = e.target.value;
                              setFlightForm(f => ({ ...f, max_players: raw === '' ? 0 : (parseInt(raw) || 0) }));
                            }}
                            onBlur={e => {
                              const parsed = parseInt(e.target.value);
                              const clamped = Number.isNaN(parsed) ? 4 : Math.min(4, Math.max(1, parsed));
                              setFlightForm(f => ({ ...f, max_players: clamped }));
                            }}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Startholes</label>
                        <div className="flex gap-3">
                          {startHoleOptions.map(hole => (
                            <button
                              key={hole}
                              type="button"
                              onClick={() => toggleStartHole(hole)}
                              className={`w-10 h-10 rounded-xl border-2 transition-colors font-medium text-sm ${
                                flightForm.start_holes.includes(hole)
                                  ? 'bg-green-900/30 border-green-600 text-green-400'
                                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              {hole}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Sorteer op</label>
                          <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as 'handicap_asc' | 'random')}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-green-600"
                          >
                            <option value="handicap_asc">Handicap laag → hoog</option>
                            <option value="random">Willekeurig</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1.5">Indeling</label>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSplitByCategory(false)}
                              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                                !splitByCategory
                                  ? 'bg-green-900/30 border-green-600 text-green-400'
                                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              Gemengde categorieen
                            </button>
                            <button
                              type="button"
                              onClick={() => setSplitByCategory(true)}
                              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                                splitByCategory
                                  ? 'bg-green-900/30 border-green-600 text-green-400'
                                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              Per categorie
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowFlightSettings(false)}
                          className="flex-1 py-3 bg-gray-700 text-white rounded-xl text-sm"
                        >
                          Sluiten
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flight cards */}
                {flights.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nog geen flights gegenereerd.</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 text-center">
                      Sleep spelers tussen flights om ze te verplaatsen
                    </p>
                    <div className="space-y-4">
                      {flights.map((f) => {
                        const catName = categories.find(c => c.id === f.category_id)?.name;
                        const playersInFlight = players.filter(p => p.flight_id === f.id);
                        return (
                          <div
                            key={f.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, f.id)}
                          >
                            {/* Flight header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                {editingFlightId === f.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingFlightName}
                                      onChange={e => setEditingFlightName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') saveFlightName(f.id);
                                        if (e.key === 'Escape') setEditingFlightId(null);
                                      }}
                                      placeholder="Naam (optioneel)"
                                      autoFocus
                                      className="px-2 py-1 bg-gray-800 border border-green-600 rounded-lg text-white text-sm focus:outline-none w-40"
                                    />
                                    <button onClick={() => saveFlightName(f.id)} className="text-green-400 text-sm hover:text-green-300">✓</button>
                                    <button onClick={() => setEditingFlightId(null)} className="text-gray-500 text-sm hover:text-gray-300">✕</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingFlightId(f.id); setEditingFlightName(f.name ?? ''); }}
                                    className="group flex items-center gap-1.5 text-left"
                                    title="Klik om naam te bewerken"
                                  >
                                    {f.name?.trim() && (
                                      <h4 className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors">{f.name}</h4>
                                    )}
                                    <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                                  </button>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {f.start_time && format.dateTime(new Date(f.start_time), { hour: '2-digit', minute: '2-digit' })}
                                  {f.tee_number && ` · Hole ${f.tee_number}`}
                                  {catName && ` · ${catName}`}
                                  {` · ${playersInFlight.length}/${f.max_players} spelers`}
                                </p>
                              </div>
                            </div>

                            {/* Player cards */}
                            <div className="space-y-1.5">
                              {playersInFlight.length === 0 ? (
                                <div className="border border-dashed border-gray-700 rounded-lg py-3 text-center">
                                  <p className="text-xs text-gray-500">Sleep een speler hiernaartoe</p>
                                </div>
                              ) : (
                                playersInFlight.map(pl => (
                                  <div
                                    key={pl.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, pl.id)}
                                    className={`bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-gray-750 transition-colors ${
                                      pl.status === 'dns' ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-gray-400 text-xs cursor-grab">⠿</span>
                                      <span className={`text-sm truncate ${pl.status === 'dns' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                        {pl.name}
                                      </span>
                                      {pl.handicap !== null && (
                                        <span className="text-gray-500 text-xs shrink-0">HCP {pl.handicap}</span>
                                      )}
                                      {pl.gender && (
                                        <span className="text-gray-600 text-xs shrink-0">
                                          {pl.gender === 'male' ? 'M' : pl.gender === 'female' ? 'V' : ''}
                                        </span>
                                      )}
                                      {pl.status === 'dns' && (
                                        <span className="text-xs font-medium text-red-400 shrink-0">DNS</span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => removePlayerFromFlight(pl.id)}
                                        title="Uit flight halen"
                                        className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded-md hover:bg-red-900/50 transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB: Scorecorrecties ===== */}
        {activeTab === 'corrections' && (
          <div className="space-y-4">
            {holes.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
                <span className="text-5xl">🏌️</span>
                <h3 className="text-lg font-semibold text-white mt-4 mb-2">Geen holes gevonden</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Koppel eerst een baan aan het toernooi via het tabblad Bewerken.
                </p>
              </div>
            ) : flights.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
                <span className="text-5xl">🗂️</span>
                <h3 className="text-lg font-semibold text-white mt-4 mb-2">Nog geen flights</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Genereer eerst flights via het tabblad Flights.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <label className="block text-sm text-gray-400 mb-2">Selecteer flight</label>
                  <select
                    value={selectedFlightId}
                    onChange={e => setSelectedFlightId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
                  >
                    <option value="">-- Kies een flight --</option>
                    {flights.map(f => {
                      const catName = categories.find(c => c.id === f.category_id)?.name;
                      const playerCount = players.filter(p => p.flight_id === f.id).length;
                      return (
                        <option key={f.id} value={f.id}>
                          {flightLabel(f, flights.indexOf(f))} ({playerCount} spelers{catName ? ` · ${catName}` : ''})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedFlightId && (
                  <ScoreGrid
                    tournamentId={params.id}
                    players={players.filter(p => p.flight_id === selectedFlightId) as any}
                    holes={holes}
                    tournamentFormat={tournament.format as 'stroke' | 'stableford' | 'match'}
                    scoringType={tournament.scoring_type as 'gross' | 'net'}
                    tournamentRounds={tournament.rounds}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB: Toegangscodes ===== */}
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
                          {expired ? 'Verlopen' : !c.is_active ? 'Gedeactiveerd' : `Geldig tot ${format.dateTime(new Date(c.expires_at), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
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
              onChange={e => setPauseReason(e.target.value)}
              placeholder="bijv. Weersomstandigheden — hervatting om 14:30"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500 mb-4"
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
