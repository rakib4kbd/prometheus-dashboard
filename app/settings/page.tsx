'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [targets, setTargets] = useState<string[]>([]);
  const [newTarget, setNewTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    axios.get('/api/targets').then((r) => setTargets(r.data)).catch(() => router.push('/'));
  }, [router]);

  const mutateTargets = async (updated: string[]) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/api/targets', { targets: updated });
      setTargets(res.data.targets);
      return true;
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'Operation failed';
      setError(msg || 'Operation failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim()) return;
    const ok = await mutateTargets([...targets, newTarget.trim()]);
    if (ok) {
      setNewTarget('');
      setSuccess('Target added');
    }
  };

  const removeTarget = (target: string) => mutateTargets(targets.filter((t) => t !== target));

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</a>
        </div>
        <div className="flex-none font-bold text-lg pr-4">Target Management</div>
      </div>

      <div className="container mx-auto p-6 max-w-2xl space-y-4">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Add Target</h3>
            <form onSubmit={addTarget} className="flex gap-2">
              <input
                className="input input-bordered flex-1"
                placeholder="https://example.com"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Add'}
              </button>
            </form>
            {error && <div className="alert alert-error text-sm py-2 mt-2">{error}</div>}
            {success && <div className="alert alert-success text-sm py-2 mt-2">{success}</div>}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Monitored Targets ({targets.length})</h3>
            {targets.length === 0 ? (
              <p className="text-sm opacity-60">No targets configured</p>
            ) : (
              <ul className="space-y-2">
                {targets.map((t) => (
                  <li
                    key={t}
                    className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2"
                  >
                    <span className="text-sm font-mono break-all">{t}</span>
                    <button
                      className="btn btn-ghost btn-xs text-error ml-2 shrink-0"
                      onClick={() => removeTarget(t)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
