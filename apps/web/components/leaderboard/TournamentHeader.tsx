'use client';

import { useState } from 'react';
import { RoundSelector } from './RoundSelector';
import { TournamentInfo } from './TournamentInfo';
import { LiveBadge } from './LiveBadge';

interface Props {
  name: string;
  description?: string | null | undefined;
  format: string;
  scoringType: string;
  status: string;
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  courseName?: string | null | undefined;
  rounds: number;
  selectedRound: number | null;
  onRoundChange: (round: number | null) => void;
  playerCount?: number;
  flightCount?: number;
  registrationStart?: string | null | undefined;
  registrationEnd?: string | null | undefined;
  registrationFee?: number | null | undefined;
  maxParticipants?: number | null | undefined;
  startFormat?: string | null | undefined;
  competitionMode?: string | null | undefined;
  ageMin?: number | null | undefined;
  ageMax?: number | null | undefined;
  handicapCalculation?: string | null | undefined;
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
  registrationStart,
  registrationEnd,
  registrationFee,
  maxParticipants,
  startFormat,
  competitionMode,
  ageMin,
  ageMax,
  handicapCalculation,
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
      <div className="sticky top-0 z-20 bg-surface-2/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-content truncate">
                    {name}
                  </h1>
                  <p className="text-xs sm:text-sm text-content-muted truncate">
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
                className="w-9 h-9 rounded-lg bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-content-muted hover:text-content transition-colors"
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
          registrationStart={registrationStart}
          registrationEnd={registrationEnd}
          registrationFee={registrationFee}
          maxParticipants={maxParticipants}
          startFormat={startFormat}
          competitionMode={competitionMode}
          ageMin={ageMin}
          ageMax={ageMax}
          handicapCalculation={handicapCalculation}
          onClose={() => setShowInfo(false)}
        />
      )}
    </>
  );
}
