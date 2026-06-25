'use client';

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
  playerCount?: number;
  flightCount?: number;
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

  const items = [
    { label: 'Format', value: formatLabels[format] ?? format },
    { label: 'Scoring', value: scoringLabels[scoringType] ?? scoringType },
    { label: 'Rondes', value: `${rounds}` },
    { label: 'Status', value: statusLabels[status] ?? status },
  ];

  if (courseName) items.push({ label: 'Baan', value: courseName });
  if (startDate) items.push({ label: 'Start', value: new Date(startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) });
  if (endDate) items.push({ label: 'Einde', value: new Date(endDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) });
  if (playerCount !== undefined) items.push({ label: 'Spelers', value: `${playerCount}` });
  if (flightCount !== undefined) items.push({ label: 'Flights', value: `${flightCount}` });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border-l border-gray-800 h-full overflow-y-auto shadow-2xl animate-slide-in-right">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white">Toernooi Informatie</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            {description && (
              <p className="text-sm text-gray-400 mt-1">{description}</p>
            )}
          </div>

          <div className="space-y-3">
            {items.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
