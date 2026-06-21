'use client';

export function LiveBadge() {
  return (
    <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 px-3 py-1.5 rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-xs font-bold text-green-400 tracking-wider">LIVE</span>
    </div>
  );
}
