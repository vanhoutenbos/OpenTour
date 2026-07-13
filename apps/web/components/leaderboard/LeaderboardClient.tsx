'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { LeaderboardEntry } from '@opentour/types';
import { fetchLeaderboardData, POLL_INTERVAL_MS } from '@/lib/fetchLeaderboard';
import { useFavorites } from '@/lib/useFavorites';
import { TournamentHeader } from './TournamentHeader';
import { FilterBar } from './FilterBar';
import { SponsorBanner } from './SponsorBanner';
import { LeaderboardTable } from './LeaderboardTable';
import { TeeTimesView } from './TeeTimesView';
import { CourseStats } from './CourseStats';
import { MatchplayView } from './MatchplayView';
import { LadderPyramidView } from './LadderPyramidView';

type LeaderboardTab = 'leaderboard' | 'matchplay' | 'ladder' | 'teetimes' | 'coursestats';

interface FlightInfo {
  id: string;
  name: string | null;
  start_time: string | null;
  tee_number: number;
  sort_order?: number | null;
  category_name?: string | undefined;
  players: {
    id: string;
    name: string;
    handicap?: number | null;
    started_on_hole?: number;
  }[];
}

interface Props {
  tournamentId: string;
  activeMatchplayRound?: number;
  tournamentName: string;
  tournamentDescription?: string | null;
  format: string;
  /** Structuur over tijd, los van format. 'ladder' toont de piramide i.p.v. het
   * reguliere leaderboard/matchplay-bracket. Zie analyseplan §2 en de addendum. */
  competitionType?: string;
  scoringType: string;
  isActive: boolean;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  courseName?: string | null;
  rounds: number;
  flights?: FlightInfo[];
  playerCount?: number;
  flightCount?: number;
  hideExtras?: boolean;
}

export function LeaderboardClient({
  tournamentId,
  tournamentName,
  activeMatchplayRound,
  tournamentDescription,
  format: scoringFormat,
  competitionType = 'single',
  scoringType,
  isActive,
  status,
  startDate,
  endDate,
  courseName,
  rounds,
  flights,
  playerCount,
  flightCount,
  hideExtras: hideExtrasProp,
}: Props) {
  const hideExtras = hideExtrasProp ?? false;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(competitionType === 'ladder' ? 'ladder' : 'leaderboard');

  const { favorites, isFavorite, toggleFavorite, favoriteCount } = useFavorites(tournamentId);

  // Toon standaard Tee Times als toernooi nog niet actief is
  useEffect(() => {
    if (status === 'draft' && flights && flights.length > 0) {
      setActiveTab('teetimes');
    }
  }, [status, flights]);

  // Bijhouden vorige posities voor ▲▼ indicators
  const prevPositionsRef = useRef<Map<string, number>>(new Map());

  const poll = useCallback(async () => {
    try {
      const data = await fetchLeaderboardData(tournamentId);

      // Bereken movement door te vergelijken met vorige poll
      const currentPositions = new Map<string, number>();
      const enriched = (data ?? []).map((entry: LeaderboardEntry) => {
        currentPositions.set(entry.player_id, entry.position);
        const prevPos = prevPositionsRef.current.get(entry.player_id);
        return { ...entry, previous_position: prevPos ?? entry.position };
      });
      prevPositionsRef.current = currentPositions;

      setEntries(enriched);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
    } catch {
      setError('Leaderboard tijdelijk niet beschikbaar');
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    poll();
    if (isActive) {
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll, isActive]);

  const uniqueFlights = useMemo(() => {
    // Bouw een gesorteerde lijst van unieke flights op basis van sort_order
    // Sleutel = sort_order (of flight_name als fallback), label = "Flight N" of de naam
    const seen = new Map<number | string, { key: string; label: string; sortOrder: number }>();
    entries.forEach((e) => {
      const order = e.flight_sort_order;
      const name = e.flight_name;
      if (order == null && !name) return;
      const key = order != null ? `order:${order}` : `name:${name}`;
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label: name ?? `Flight ${order}`,
          sortOrder: order ?? 9999,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [entries]);

  // Filter de entries voor de LeaderboardTable
  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.player_name.toLowerCase().includes(q));
    }
    if (selectedFlight) {
      list = list.filter((e) => {
        const order = e.flight_sort_order;
        const name = e.flight_name;
        const key = order != null ? `order:${order}` : `name:${name}`;
        return key === selectedFlight;
      });
    }
    if (showFavoritesOnly) {
      list = list.filter((e) => isFavorite(e.player_id));
    }

    list.sort((a, b) => {
      const aFav = isFavorite(a.player_id) ? 0 : 1;
      const bFav = isFavorite(b.player_id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.position - b.position;
    });

    return list;
  }, [entries, searchQuery, selectedFlight, showFavoritesOnly, isFavorite]);

  // Als ingebed in het organisatorscherm: altijd de hoofdweergave, geen navigatie
  useEffect(() => {
    if (hideExtras) setActiveTab(competitionType === 'ladder' ? 'ladder' : 'leaderboard');
  }, [hideExtras, competitionType]);

  // Subtab configuratie — alleen zichtbaar op de publieke leaderboard pagina.
  // Een ladder-toernooi heeft format='matchplay' (individuele wedstrijden worden
  // matchplay-gescoord, zie analyseplan addendum), maar moet NIET de generieke
  // Matchplay-bracket-tab tonen (die veronderstelt vooraf vastgelegde rondes, wat
  // niet past bij een doorlopende laddercompetitie) — vandaar de expliciete
  // competitionType !== 'ladder' voorwaarde hieronder.
  const isLadder = competitionType === 'ladder';
  const tabs: { key: LeaderboardTab; label: string; show: boolean }[] = [
    { key: 'ladder', label: 'Piramide', show: isLadder },
    { key: 'leaderboard', label: 'Leaderboard', show: !isLadder },
    { key: 'teetimes', label: 'Tee Times', show: !isLadder },
    { key: 'matchplay', label: 'Matchplay', show: scoringFormat === 'matchplay' && !isLadder },
    { key: 'coursestats', label: 'Course Stats', show: true },
  ];

  const visibleTabs = hideExtras ? [] : tabs.filter((t) => t.show);

  return (
    <div className="space-y-0">
      {!hideExtras && (
        <>
          <TournamentHeader
            name={tournamentName}
            description={tournamentDescription}
            format={scoringFormat}
            scoringType={scoringType}
            status={status}
            startDate={startDate}
            endDate={endDate}
            courseName={courseName}
            rounds={rounds}
            selectedRound={selectedRound}
            onRoundChange={setSelectedRound}
            playerCount={playerCount ?? entries.length}
            flightCount={flightCount ?? uniqueFlights.length}
          />

          {/* Sponsor mid-banner — tijdelijk verborgen, zie B21 in design doc */}
          {false && (
            <div className="px-4 pt-4">
              <SponsorBanner position="mid" />
            </div>
          )}
        </>
      )}

      {/* Subtab navigation */}
      {visibleTabs.length > 1 && (
        <div className="border-b border-border px-4">
          <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto flex gap-4 overflow-x-auto scrollbar-none">
            {visibleTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === key
                    ? 'border-green-500 text-content'
                    : 'border-transparent text-content-muted hover:text-content'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto px-4 py-4">
        {/* TEE TIMES */}
        {activeTab === 'teetimes' && flights && (
          <TeeTimesView flights={flights} round={1} />
        )}

        {/* MATCHPLAY */}
        {activeTab === 'matchplay' && (
          <MatchplayView tournamentId={tournamentId} activeRound={activeMatchplayRound} />
        )}

        {/* LADDER */}
        {activeTab === 'ladder' && (
          <LadderPyramidView tournamentId={tournamentId} />
        )}

        {/* COURSE STATS */}
        {activeTab === 'coursestats' && (
          <CourseStats tournamentId={tournamentId} />
        )}

        {/* LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <>
            {loading && (
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 bg-surface-3 rounded-lg" />
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-content-muted">
                <p>{error}</p>
                <button
                  onClick={poll}
                  className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600"
                >
                  Opnieuw proberen
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  flights={uniqueFlights}
                  selectedFlight={selectedFlight}
                  onFlightChange={setSelectedFlight}
                  showFavoritesOnly={hideExtras ? false : showFavoritesOnly}
                  onFavoritesToggle={hideExtras ? undefined : () => setShowFavoritesOnly((v) => !v)}
                  playerCount={filteredEntries.length}
                  favoriteCount={hideExtras ? 0 : favoriteCount}
                  lastUpdated={lastUpdated}
                  isActive={isActive}
                  hideFavorites={hideExtras}
                />

                <div className="mt-4">
                  <LeaderboardTable
                    entries={entries}
                    format={scoringFormat}
                    scoringType={scoringType}
                    isFavorite={hideExtras ? () => false : isFavorite}
                    onToggleFavorite={hideExtras ? undefined : toggleFavorite}
                    searchQuery={searchQuery}
                    selectedFlight={selectedFlight}
                    showFavoritesOnly={hideExtras ? false : showFavoritesOnly}
                    selectedRound={selectedRound}
                    tournamentId={tournamentId}
                    tournamentRounds={rounds}
                    hideFavorites={hideExtras}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
