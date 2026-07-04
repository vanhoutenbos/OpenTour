'use client';

interface Props {
  rounds: number;
  selected: number | null;
  onChange: (round: number | null) => void;
}

export function RoundSelector({ rounds, selected, onChange }: Props) {
  if (rounds <= 1) return null;

  const handleClick = (r: number | null) => {
    onChange(r === selected ? null : r);
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
        <button
          key={r}
          onClick={() => handleClick(r)}
          className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
            selected === r
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : 'bg-surface-3 text-content-muted hover:bg-surface-4 hover:text-content'
          }`}
        >
          R{r}
        </button>
      ))}
      {rounds > 1 && (
        <button
          onClick={() => handleClick(null)}
          className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
            selected === null
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : 'bg-surface-3 text-content-muted hover:bg-surface-4 hover:text-content'
          }`}
        >
          ALL
        </button>
      )}
    </div>
  );
}
