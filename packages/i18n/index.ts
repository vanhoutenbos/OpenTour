import nlCommon from './nl/common.json';
import nlErrors from './nl/errors.json';
import nlLeaderboard from './nl/leaderboard.json';
import nlScoring from './nl/scoring.json';
import nlTournament from './nl/tournament.json';
import enCommon from './en/common.json';
import enErrors from './en/errors.json';
import enLeaderboard from './en/leaderboard.json';
import enScoring from './en/scoring.json';
import enTournament from './en/tournament.json';

export const messages = {
  nl: {
    common: nlCommon,
    errors: nlErrors,
    leaderboard: nlLeaderboard,
    scoring: nlScoring,
    tournament: nlTournament,
  },
  en: {
    common: enCommon,
    errors: enErrors,
    leaderboard: enLeaderboard,
    scoring: enScoring,
    tournament: enTournament,
  },
} as const;

export type Locale = keyof typeof messages;
export type Namespace = keyof typeof messages.nl;

export function getMessages(locale: Locale) {
  return messages[locale];
}
