'use client';

interface Props {
  reason: string;
}

export function PauseBanner({ reason }: Props) {
  return (
    <div className="bg-yellow-900/40 border-b border-yellow-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-2xl">⏸️</span>
        <div>
          <p className="font-semibold text-yellow-300">Toernooi gepauzeerd</p>
          <p className="text-sm text-yellow-200">{reason}</p>
        </div>
      </div>
    </div>
  );
}
