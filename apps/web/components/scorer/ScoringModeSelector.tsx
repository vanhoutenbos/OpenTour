'use client';

import { useTranslations } from 'next-intl';

interface Props {
  onSelect: (mode: 'follow' | 'holes_per_flight') => void;
}

export function ScoringModeSelector({ onSelect }: Props) {
  const t = useTranslations('scorer');

  return (
    <div className="space-y-6">
      <p className="text-sm text-content-muted text-center">
        Kies hoe je scores wilt invoeren
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('follow')}
          className="flex flex-col items-center gap-3 p-6 bg-surface-2 border border-border
                     rounded-xl hover:border-green-700 hover:bg-surface-4/50 transition-all active:scale-98"
        >
          <span className="text-4xl">🚶</span>
          <span className="font-semibold text-content text-lg">{t('mode.follow_flight')}</span>
          <span className="text-sm text-content-muted text-center">
            Loop mee met de flight en voer scores per hole in
          </span>
        </button>
        <button
          onClick={() => onSelect('holes_per_flight')}
          className="flex flex-col items-center gap-3 p-6 bg-surface-2 border border-border
                     rounded-xl hover:border-green-700 hover:bg-surface-4/50 transition-all active:scale-98"
        >
          <span className="text-4xl">⛳</span>
          <span className="font-semibold text-content text-lg">{t('mode.holes_per_flight')}</span>
          <span className="text-sm text-content-muted text-center">
            Blijf op de tee en voer scores per hole in voor alle spelers
          </span>
        </button>
      </div>
    </div>
  );
}
