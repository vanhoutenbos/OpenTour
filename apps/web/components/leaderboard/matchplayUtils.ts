export interface MatchplayMatch {
  tournament_id: string;
  round_number: number;
  player_a_id: string;
  player_a_name: string;
  player_b_id: string;
  player_b_name: string;
  holes_won_a: number;
  holes_won_b: number;
  holes_halved: number;
  standing: number;
  holes_played: number;
  standing_text: string;
  hole_results: string[] | null;
}

export function getMatchStatus(match: MatchplayMatch): 'pending' | 'live' | 'finished' {
  if (match.holes_played === 0) return 'pending';
  if (match.holes_played >= 18) return 'finished';
  return 'live';
}

export function getMatchStatusLabel(match: MatchplayMatch): string {
  switch (getMatchStatus(match)) {
    case 'pending':
      return 'Nog niet gestart';
    case 'live':
      return 'Live';
    default:
      return 'Afgerond';
  }
}

export function getStandingLabel(match: MatchplayMatch): string {
  const normalized = match.standing_text?.trim().toLowerCase() ?? '';
  if (!normalized) {
    if (match.standing > 0) return `${match.standing} up`;
    if (match.standing < 0) return `${Math.abs(match.standing)} down`;
    return 'All square';
  }

  if (normalized === 'as') return 'All square';
  if (normalized.endsWith('up')) return normalized.replace(/up$/, ' up');
  if (normalized.endsWith('dn')) return normalized.replace(/dn$/, ' down');
  return normalized;
}

export function getRoundLabel(roundNumber: number): string {
  return roundNumber === 1 ? 'Ronde 1' : `Ronde ${roundNumber}`;
}

export function getRoundStage(roundNumber: number, activeRound: number): 'completed' | 'active' | 'upcoming' {
  if (roundNumber < activeRound) return 'completed';
  if (roundNumber === activeRound) return 'active';
  return 'upcoming';
}

export function clampRound(roundNumber: number, maxRound: number): number {
  return Math.min(Math.max(roundNumber, 1), maxRound);
}

export function normalizeActiveRound(roundNumber: number | null | undefined, maxRound: number): number {
  if (typeof roundNumber !== 'number' || Number.isNaN(roundNumber)) return 1;
  return clampRound(roundNumber, Math.max(1, maxRound));
}

export function getHoleBadgeClass(result: string | null | undefined): string {
  if (result === 'A') {
    return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
  }
  if (result === 'B') {
    return 'border-rose-500/60 bg-rose-500/10 text-rose-300';
  }
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

export function getHoleBadgeLabel(result: string | null | undefined): string {
  if (result === 'A') return 'A';
  if (result === 'B') return 'B';
  return '½';
}
