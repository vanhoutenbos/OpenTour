'use client';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface Props {
  status: SyncStatus;
  pendingCount?: number;
}

const CONFIG: Record<SyncStatus, { icon: string; label: string; className: string }> = {
  synced:  { icon: '✅', label: 'Gesynchroniseerd',              className: 'bg-green-900/40 text-green-300 border-green-800' },
  syncing: { icon: '🔄', label: 'Synchroniseren...',             className: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  offline: { icon: '📴', label: 'Offline — scores bewaard',      className: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
  error:   { icon: '❌', label: 'Fout bij sync — probeer opnieuw', className: 'bg-red-900/40 text-red-300 border-red-800' },
};

export function SyncStatusBar({ status, pendingCount }: Props) {
  const config = CONFIG[status];
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b text-sm ${config.className}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {pendingCount !== undefined && pendingCount > 0 && (
        <span className="ml-auto text-xs opacity-75">{pendingCount} wachtend</span>
      )}
    </div>
  );
}
