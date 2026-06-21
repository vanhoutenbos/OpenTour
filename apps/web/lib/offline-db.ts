/**
 * OpenTour — IndexedDB offline opslag via Dexie.js
 * Gebruikt door de scorer PWA voor offline score invoer
 */

import Dexie, { type Table } from 'dexie';
import type { PendingScore } from '@opentour/types';

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

/**
 * Score lokaal opslaan (altijd eerst, daarna synchroniseren)
 */
export async function saveScoreLocally(score: Omit<PendingScore, 'localId' | 'synced'>): Promise<string> {
  const localId = crypto.randomUUID();
  await db.pending_scores.add({
    localId,
    ...score,
    synced: false,
  });
  return localId;
}

/**
 * Alle ongesynchroniseerde scores ophalen
 */
export async function getPendingScores(): Promise<PendingScore[]> {
  return db.pending_scores.where('synced').equals(0).toArray();
}

/**
 * Score markeren als gesynchroniseerd
 */
export async function markScoreSynced(localId: string): Promise<void> {
  await db.pending_scores.update(localId, { synced: true });
}

/**
 * Synchronisatiefout opslaan
 */
export async function markSyncError(localId: string, error: string): Promise<void> {
  await db.pending_scores.update(localId, { sync_error: error });
}
