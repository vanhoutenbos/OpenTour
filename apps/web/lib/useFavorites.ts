'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'ot-favorites:';
const MAX_FAVORITES = 5;

function getKey(tournamentId: string) {
  return `${STORAGE_PREFIX}${tournamentId}`;
}

function loadFavorites(tournamentId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getKey(tournamentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveFavorites(tournamentId: string, favorites: string[]) {
  try {
    localStorage.setItem(getKey(tournamentId), JSON.stringify(favorites));
  } catch {
    // localStorage vol of uitgeschakeld
  }
}

export function useFavorites(tournamentId: string) {
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFavorites(tournamentId)
  );

  useEffect(() => {
    saveFavorites(tournamentId, favorites);
  }, [tournamentId, favorites]);

  const isFavorite = useCallback(
    (playerId: string) => favorites.includes(playerId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (playerId: string) => {
      setFavorites((prev) => {
        if (prev.includes(playerId)) {
          return prev.filter((id) => id !== playerId);
        }
        if (prev.length >= MAX_FAVORITES) {
          return prev;
        }
        return [...prev, playerId];
      });
    },
    []
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    favoriteCount: favorites.length,
    maxFavorites: MAX_FAVORITES,
  };
}
