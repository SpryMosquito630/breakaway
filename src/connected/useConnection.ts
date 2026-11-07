import { connectedAccessAllowed } from './access';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { connectedClient } from './client';
export function useConnection() {
  const allowed = connectedAccessAllowed();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!connectedClient);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!connectedClient || !allowed) { setUser(null); setLoading(false); return; }
    let live = true;
    const apply = async () => {
      const { data, error } = await connectedClient!.auth.getUser();
      if (live) { setUser(error ? null : data.user); setLoading(false); }
    };
    void apply().catch(e => { if (live) { setError(String(e)); setLoading(false); } });
    const { data } = connectedClient.auth.onAuthStateChange(() => { setTimeout(() => { if (live) void apply(); }, 0); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [allowed]);
  return { user, loading, error, configured: !!connectedClient };
}
