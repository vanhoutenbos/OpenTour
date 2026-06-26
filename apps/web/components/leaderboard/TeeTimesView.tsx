'use client';

import { useFormatter } from 'next-intl';

interface FlightInfo {
  id: string;
  name: string | null;
  start_time: string | null;
  tee_number: number;
  sort_order?: number | null;
  category_name?: string | undefined;
  players: {
    id: string;
    name: string;
    handicap?: number | null;
    started_on_hole?: number;
  }[];
}

interface Props {
  flights: FlightInfo[];
  round?: number;
}

export function TeeTimesView({ flights, round = 1 }: Props) {
  const format = useFormatter();

  // Groepeer op start hole
  const hole1 = flights.filter((f) => f.tee_number === 1 || f.tee_number === 0);
  const hole10 = flights.filter((f) => f.tee_number === 10);

  if (flights.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nog geen flights gegenereerd
      </div>
    );
  }

  const renderFlight = (flight: FlightInfo) => (
    <div
      key={flight.id}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {(flight.name || flight.sort_order != null) && (
            <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
              {flight.name ?? `Flight ${flight.sort_order}`}
            </span>
          )}
          {flight.start_time && (
            <span className="text-xs text-gray-400">
              {format.dateTime(new Date(flight.start_time), {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {flight.category_name && (
            <span className="text-xs text-gray-500">{flight.category_name}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {flight.players.length} spelers
        </span>
      </div>
      <div className="space-y-1">
        {flight.players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            {p.started_on_hole && p.started_on_hole !== 1 && (
              <span className="text-gray-500 text-xs font-bold" title={`Gestart op hole ${p.started_on_hole}`}>
                *
              </span>
            )}
            <span className="text-white">{p.name}</span>
            {p.handicap !== null && p.handicap !== undefined && (
              <span className="text-gray-500 text-xs">HCP {p.handicap}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-400">
        Ronde {round}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hole 1 */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Hole 1
          </h3>
          <div className="space-y-3">
            {hole1.length === 0 ? (
              <p className="text-gray-600 text-sm italic">Geen flights</p>
            ) : (
              hole1.map(renderFlight)
            )}
          </div>
        </div>

        {/* Hole 10 */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Hole 10
          </h3>
          <div className="space-y-3">
            {hole10.length === 0 ? (
              <p className="text-gray-600 text-sm italic">Geen flights</p>
            ) : (
              hole10.map(renderFlight)
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 pt-2">
        * Speler gestart op hole 10
      </div>
    </div>
  );
}
