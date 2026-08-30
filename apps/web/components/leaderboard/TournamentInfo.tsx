'use client';

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
  playerCount?: number | undefined;
  flightCount?: number | undefined;
  registrationStart?: string | null | undefined;
  registrationEnd?: string | null | undefined;
  registrationFee?: number | null | undefined;
  maxParticipants?: number | null | undefined;
  startFormat?: string | null | undefined;
  competitionMode?: string | null | undefined;
  ageMin?: number | null | undefined;
  ageMax?: number | null | undefined;
  handicapCalculation?: string | null | undefined;
  onClose: () => void;
}

export function TournamentInfo({
  name,
  description,
  format,
  scoringType,
  status,
  startDate,
  endDate,
  courseName,
  rounds,
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
  onClose,
}: Props) {
  const formatLabels: Record<string, string> = {
    stroke: 'Strokeplay',
    stableford: 'Stableford',
    match: 'Matchplay',
  };
  const scoringLabels: Record<string, string> = {
    gross: 'Bruto',
    net: 'Netto',
  };
  const statusLabels: Record<string, string> = {
    draft: 'Concept',
    active: 'Actief',
    paused: 'Gepauzeerd',
    finished: 'Afgelopen',
  };
  const handicapLabels: Record<string, string> = {
    none: 'Geen',
    qualifying: 'Qualifying (WHS)',
    social: 'Social',
  };

  const items = [
    { label: 'Format', value: formatLabels[format] ?? format },
    { label: 'Scoring', value: scoringLabels[scoringType] ?? scoringType },
    { label: 'Rondes', value: `${rounds}` },
    { label: 'Status', value: statusLabels[status] ?? status },
  ];

  if (courseName) items.push({ label: 'Baan', value: courseName });
  if (startDate) items.push({ label: 'Start', value: new Date(startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) });
  if (endDate) items.push({ label: 'Einde', value: new Date(endDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) });
  if (registrationStart && registrationEnd) items.push({ label: 'Inschrijfperiode', value: `${new Date(registrationStart).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} tot ${new Date(registrationEnd).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}` });
  if (registrationFee !== undefined && registrationFee !== null) items.push({ label: 'Inschrijftarief', value: `EUR ${registrationFee.toFixed(2)}` });
  if (maxParticipants !== undefined && maxParticipants !== null) items.push({ label: 'Max deelnemers', value: `${maxParticipants}` });
  if (startFormat) items.push({ label: 'Startvorm', value: startFormat });
  if (competitionMode) items.push({ label: 'Modus', value: competitionMode === 'team' ? 'Team' : 'Individueel' });
  if (ageMin !== undefined && ageMin !== null && ageMax !== undefined && ageMax !== null) items.push({ label: 'Leeftijd', value: `van ${ageMin} tot ${ageMax}` });
  if (handicapCalculation) items.push({ label: 'Handicapverrekening', value: handicapLabels[handicapCalculation] ?? handicapCalculation });
  if (playerCount !== undefined) items.push({ label: 'Aantal inschrijvingen', value: `${playerCount}` });
  if (flightCount !== undefined) items.push({ label: 'Flights', value: `${flightCount}` });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-2 border-l border-border h-full overflow-y-auto shadow-2xl animate-slide-in-right">
        <div className="sticky top-0 bg-surface-2 border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-content">Toernooi Informatie</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-content-muted hover:text-content transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-content">{name}</h3>
            {description && (
              <p className="text-sm text-content-muted mt-1">{description}</p>
            )}
          </div>

          <div className="space-y-3">
            {items.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-content-muted">{label}</span>
                <span className="text-sm font-medium text-content">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
