export interface LadderStandingEntry {
  position_id: string;
  tournament_id: string;
  tournament_player_id: string;
  player_name: string;
  handicap: number | null;
  player_status: string;
  category_id: string | null;
  category_name: string | null;
  rung_number: number;
  position_in_rung: number;
  updated_at: string;
  active_challenge_id: string | null;
  active_challenge_status: 'pending' | 'accepted' | null;
  active_challenge_deadline: string | null;
  active_challenge_role: 'challenger' | 'challenged' | null;
  active_challenge_opponent_name: string | null;
}

export interface LadderPyramid {
  categoryId: string | null;
  categoryName: string | null;
  rungs: { rungNumber: number; entries: LadderStandingEntry[] }[];
}

/** Groepeert platte standings-rijen tot een of meerdere piramides (per categorie),
 * elk met hun eigen, gesorteerde tredes. Categorieën zonder ladder-deelnemers worden
 * overgeslagen; de "geen categorie" (gemengde) groep komt als eerste als die bestaat. */
export function buildPyramids(entries: LadderStandingEntry[]): LadderPyramid[] {
  const byCategory = new Map<string, LadderStandingEntry[]>();
  entries.forEach((entry) => {
    const key = entry.category_id ?? '__none__';
    const existing = byCategory.get(key) ?? [];
    existing.push(entry);
    byCategory.set(key, existing);
  });

  const pyramids: LadderPyramid[] = Array.from(byCategory.entries()).map(([key, groupEntries]) => {
    const rungMap = new Map<number, LadderStandingEntry[]>();
    groupEntries.forEach((entry) => {
      const existing = rungMap.get(entry.rung_number) ?? [];
      existing.push(entry);
      rungMap.set(entry.rung_number, existing);
    });
    const rungs = Array.from(rungMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rungNumber, rungEntries]) => ({
        rungNumber,
        entries: rungEntries.sort((a, b) => a.position_in_rung - b.position_in_rung),
      }));

    return {
      categoryId: key === '__none__' ? null : key,
      categoryName: groupEntries[0]?.category_name ?? null,
      rungs,
    };
  });

  return pyramids.sort((a, b) => {
    if (a.categoryId === null) return -1;
    if (b.categoryId === null) return 1;
    return (a.categoryName ?? '').localeCompare(b.categoryName ?? '');
  });
}

/** Rond getal aantal dagen tot de deadline, voor een korte "reageren vóór ..." label.
 * Negatief betekent: deadline is al verstreken. */
export function daysUntil(isoDate: string): number {
  const ms = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatDeadline(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days < 0) return 'deadline verstreken';
  if (days === 0) return 'vandaag';
  if (days === 1) return 'morgen';
  return `over ${days} dagen`;
}
