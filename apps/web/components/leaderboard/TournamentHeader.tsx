'use client';

import { useState } from 'react';
import { RoundSelector } from './RoundSelector';
import { TournamentInfo } from './TournamentInfo';
import { LiveBadge } from './LiveBadge';

interface Props {
  name: string;
  description?: string | null;
  format: string;
  scoringType: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  courseName?: string;
  rounds: number;
  selectedRound: number | null;
  onRoundChange: (round: number | null) => void;
  playerCount?: number;
  flightCount?: number;
}

export function TournamentHeader({
  name,
  description,
  format,
  scoringType,
  status,
  startDate,
  endDate,
  courseName,
  rounds,
  selectedRound,
  onRoundChange,
  playerCount,
  flightCount,
}: Props) {
  const [showInfo, setShowInfo] = useState(false);

  const formatLabels: Record<string, string> = {
    stroke: 'Strokeplay',
    stableford: 'Stableford',
    match: 'Matchplay',
  };
  const scoringLabels: Record<string, string> = {
    gross: 'Bruto',
    net: 'Netto',
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {/* White-label logo slot */}
                <div
                  className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-green-500 shrink-0"
                  data-logo-slot
                >
                  OT
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                    {name}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {formatLabels[format] ?? format}
                    {courseName && ` · ${courseName}`}
                    {startDate && ` · ${new Date(startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`}
                    {endDate && ` - ${new Date(endDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {rounds > 1 && (
                <div className="hidden sm:block">
                  <RoundSelector
                    rounds={rounds}
                    selected={selectedRound}
                    onChange={onRoundChange}
                  />
                </div>
              )}

              {status === 'active' && <LiveBadge />}

              <button
                onClick={() => setShowInfo(true)}
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Toernooi informatie"
              >
                ⓘ
              </button>
            </div>
          </div>

          {/* Mobile round selector */}
          {rounds > 1 && (
            <div className="sm:hidden mt-3">
              <RoundSelector
                rounds={rounds}
                selected={selectedRound}
                onChange={onRoundChange}
              />
            </div>
          )}
        </div>
      </div>

      {showInfo && (
        <TournamentInfo
          name={name}
          description={description}
          format={format}
          scoringType={scoringType}
          status={status}
          startDate={startDate}
          endDate={endDate}
          courseName={courseName}
          rounds={rounds}
          playerCount={playerCount}
          flightCount={flightCount}
          onClose={() => setShowInfo(false)}
        />
      )}
    </>
  );
}
