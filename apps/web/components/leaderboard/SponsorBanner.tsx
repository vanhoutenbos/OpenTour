'use client';

interface Props {
  position?: 'top' | 'mid' | 'bottom';
  className?: string;
}

export function SponsorBanner({ position = 'top', className = '' }: Props) {
  const heights: Record<string, string> = {
    top: 'h-24',
    mid: 'h-20',
    bottom: 'h-16',
  };

  return (
    <div
      className={`${heights[position]} bg-surface-2/50 border border-border/50 rounded-xl flex items-center justify-center ${className}`}
      data-ad-slot={`sponsor-${position}`}
    >
      <span className="text-xs text-content-muted tracking-widest uppercase">
        Sponsor Banner — {position}
      </span>
    </div>
  );
}
