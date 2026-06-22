import Dexie, { type Table } from 'dexie';

interface PendingScore {
  localId: string;
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  updated_at: string;
  synced: boolean;
  sync_error?: string;
}

interface LocalTournament {
  id: string;
  data: string;
  cached_at: string;
}

interface LocalFlight {
  id: string;
  tournament_id: string;
  data: string;
  cached_at: string;
}

class OpenTourDB extends Dexie {
  pending_scores!: Table<PendingScore>;
  local_tournaments!: Table<LocalTournament>;
  local_flights!: Table<LocalFlight>;

  constructor() {
    super('opentour');
    this.version(1).stores({
      pending_scores: 'localId, tournament_id, player_id, hole_id, synced',
      local_tournaments: 'id',
      local_flights: 'id, tournament_id',
    });
  }
}

export const db = new OpenTourDB();

export async function saveScoreLocally(score: Omit<PendingScore, 'localId' | 'synced'>): Promise<string> {
  const localId = crypto.randomUUID();
  await db.pending_scores.add({ localId, ...score, synced: false });
  return localId;
}

export async function getPendingScores(): Promise<PendingScore[]> {
  return db.pending_scores.where('synced').equals(0).toArray();
}

export async function markScoreSynced(localId: string): Promise<void> {
  await db.pending_scores.update(localId, { synced: true });
}

export async function markSyncError(localId: string, error: string): Promise<void> {
  await db.pending_scores.update(localId, { sync_error: error });
}
