import { useEffect, useState, useCallback } from 'react';
import { syncPendingScores, getSyncBackoffDelay } from '@/lib/sync';

type OnlineStatus = 'online' | 'offline' | 'syncing';

export function useSyncOnlineStatus() {
  const [status, setStatus] = useState<OnlineStatus>(() => {
    if (typeof navigator === 'undefined') return 'online';
    return navigator.onLine ? 'online' : 'offline';
  });

  const syncWithBackoff = useCallback(async (maxAttempts = 4) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setStatus('syncing');
      try {
        const result = await syncPendingScores();
        if (result.failed === 0) {
          setStatus('online');
          return;
        }
      } catch {
        // retry with backoff
      }
      await new Promise(resolve => setTimeout(resolve, getSyncBackoffDelay(attempt)));
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      syncWithBackoff();
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithBackoff]);

  return status;
}
