'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  flights: { key: string; label: string }[];
  selectedFlight: string;
  onFlightChange: (flight: string) => void;
  showFavoritesOnly: boolean;
  onFavoritesToggle?: () => void;
  playerCount: number;
  favoriteCount: number;
  hideFavorites?: boolean;
  lastUpdated: Date | null;
  isActive: boolean;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  flights,
  selectedFlight,
  onFlightChange,
  showFavoritesOnly,
  onFavoritesToggle,
  playerCount,
  favoriteCount,
  lastUpdated,
  isActive,
  hideFavorites = false,
}: Props) {
  const t = useTranslations('leaderboard');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInput = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 150);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-b border-gray-800/60">
      {/* Zoek */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          defaultValue={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
        />
      </div>

      {/* Flight filter — alleen tonen als er meerdere flights zijn */}
      {flights.length > 0 && (
        <select
          value={selectedFlight}
          onChange={(e) => onFlightChange(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-600"
        >
          <option value="">{t('filter.all')}</option>
          {flights.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      )}

      {/* Favorites toggle — alleen op publieke pagina */}
      {!hideFavorites && (
        <button
          onClick={onFavoritesToggle}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showFavoritesOnly
              ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
          }`}
        >
          <span className={showFavoritesOnly ? '' : 'opacity-40'}>★</span>
          <span>{t('favorites')}</span>
          {favoriteCount > 0 && (
            <span className="text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded-full">
              {favoriteCount}
            </span>
          )}
        </button>
      )}

      {/* Stats rechts */}
      <div className="hidden sm:flex items-center gap-3 ml-auto text-xs text-gray-500">
        <span>{playerCount} {t('players').toLowerCase()}</span>
        {lastUpdated && (
          <span>
            {t('updated_at')}{' '}
            {lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {isActive && ` · ${t('auto_refresh')}`}
          </span>
        )}
      </div>
    </div>
  );
}
