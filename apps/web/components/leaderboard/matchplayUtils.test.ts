import { describe, expect, it } from 'vitest';
import { clampRound, getMatchStatus, getMatchStatusLabel, getStandingLabel, getRoundStage, normalizeActiveRound } from './matchplayUtils';

describe('matchplay utils', () => {
  it('returns pending, live, and finished states from played holes', () => {
    expect(getMatchStatus({
      tournament_id: 't1',
      round_number: 1,
      player_a_id: 'a',
      player_a_name: 'A',
      player_b_id: 'b',
      player_b_name: 'B',
      holes_won_a: 0,
      holes_won_b: 0,
      holes_halved: 0,
      standing: 0,
      holes_played: 0,
      standing_text: '',
      hole_results: null,
    })).toBe('pending');

    expect(getMatchStatus({
      tournament_id: 't1',
      round_number: 1,
      player_a_id: 'a',
      player_a_name: 'A',
      player_b_id: 'b',
      player_b_name: 'B',
      holes_won_a: 2,
      holes_won_b: 1,
      holes_halved: 0,
      standing: 1,
      holes_played: 3,
      standing_text: '1 up',
      hole_results: null,
    })).toBe('live');

    expect(getMatchStatus({
      tournament_id: 't1',
      round_number: 1,
      player_a_id: 'a',
      player_a_name: 'A',
      player_b_id: 'b',
      player_b_name: 'B',
      holes_won_a: 9,
      holes_won_b: 8,
      holes_halved: 1,
      standing: 1,
      holes_played: 18,
      standing_text: '1 up',
      hole_results: null,
    })).toBe('finished');
  });

  it('clamps a selected round to the available tournament rounds', () => {
    expect(clampRound(0, 3)).toBe(1);
    expect(clampRound(5, 3)).toBe(3);
    expect(clampRound(2, 3)).toBe(2);
  });

  it('normalizes active matchplay rounds against the available tournament rounds', () => {
    expect(normalizeActiveRound(0, 3)).toBe(1);
    expect(normalizeActiveRound(5, 3)).toBe(3);
    expect(normalizeActiveRound(null, 3)).toBe(1);
    expect(normalizeActiveRound(2, 3)).toBe(2);
  });

  it('derives a round-progress stage from the active round', () => {
    expect(getRoundStage(1, 2)).toBe('completed');
    expect(getRoundStage(2, 2)).toBe('active');
    expect(getRoundStage(3, 2)).toBe('upcoming');
    expect(getRoundStage(1, 1)).toBe('active');
  });

  it('formats standings for matchplay displays', () => {
    expect(getMatchStatusLabel({
      tournament_id: 't1',
      round_number: 1,
      player_a_id: 'a',
      player_a_name: 'A',
      player_b_id: 'b',
      player_b_name: 'B',
      holes_won_a: 0,
      holes_won_b: 0,
      holes_halved: 0,
      standing: 0,
      holes_played: 0,
      standing_text: '',
      hole_results: null,
    })).toBe('Nog niet gestart');

    expect(getStandingLabel({
      tournament_id: 't1',
      round_number: 1,
      player_a_id: 'a',
      player_a_name: 'A',
      player_b_id: 'b',
      player_b_name: 'B',
      holes_won_a: 2,
      holes_won_b: 1,
      holes_halved: 0,
      standing: 1,
      holes_played: 3,
      standing_text: 'AS',
      hole_results: null,
    })).toBe('All square');
  });
});
