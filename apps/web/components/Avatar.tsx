interface Props {
  name?: string | null;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
}

const colors = [
  'from-green-500 to-green-700',
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',
  'from-pink-500 to-pink-700',
  'from-orange-500 to-orange-700',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
};

const fallbackIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export function Avatar({ name, imageUrl, size = 'sm' }: Props) {
  const colorIndex = name ? hashName(name) % colors.length : 0;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ?? ''}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-border-strong`}
      />
    );
  }

  if (name) {
    return (
      <span
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-bold text-content ring-2 ring-border-strong shadow-sm`}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <span
      className={`${sizeClasses[size]} rounded-full bg-surface-3 flex items-center justify-center text-content-muted ring-2 ring-border-strong`}
    >
      {fallbackIcon}
    </span>
  );
}
