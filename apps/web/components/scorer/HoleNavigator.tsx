'use client';

import { useTranslations } from 'next-intl';

interface Hole {
  id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
}

type HoleStatus = 'empty' | 'filled' | 'verified';

interface HoleNavigatorProps {
  holes: Hole[];
  holeStatus: Record<number, HoleStatus>;
  selectedHole: number | null;
  onHoleSelect: (holeNumber: number) => void;
}

const statusStyle: Record<HoleStatus, { bg: string; border: string; labelKey: string }> = {
  empty: { bg: 'bg-gray-800', border: 'border-gray-700', labelKey: 'hole_nav.empty' },
  filled: { bg: 'bg-green-900/40', border: 'border-green-800', labelKey: 'hole_nav.completed' },
  verified: { bg: 'bg-blue-900/40', border: 'border-blue-700', labelKey: 'hole_nav.verified' },
};

export function HoleNavigator({ holes, holeStatus, selectedHole, onHoleSelect }: HoleNavigatorProps) {
  const t = useTranslations('scorer');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('hole_nav.grid')}</span>
        <div className="flex gap-2 ml-auto">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm bg-gray-700 inline-block" />
            {t('hole_nav.empty')}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm bg-green-800 inline-block" />
            {t('hole_nav.completed')}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm bg-blue-800 inline-block" />
            {t('hole_nav.verified')}
          </span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {holes.map((hole) => {
          const status = holeStatus[hole.number] ?? 'empty';
          const style = statusStyle[status];
          const isSelected = selectedHole === hole.number;

          return (
            <button
              key={hole.id}
              onClick={() => onHoleSelect(hole.number)}
              title={`Hole ${hole.number} · Par ${hole.par} · ${t(status === 'empty' ? 'hole_nav.empty' : status === 'verified' ? 'hole_nav.verified' : 'hole_nav.completed')}`}
              className={`
                flex flex-col items-center justify-center min-w-[44px] h-[44px] rounded-lg
                border transition-all shrink-0 cursor-pointer
                ${style.bg} ${style.border}
                ${isSelected
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'hover:border-gray-500 active:scale-95'
                }
              `}
            >
              <span className="text-xs font-bold leading-none text-white">{hole.number}</span>
              <span className="text-[9px] leading-none text-gray-500 mt-0.5">{hole.par}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
