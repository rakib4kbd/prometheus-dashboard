'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [success]);

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
      setSuccess('Target added successfully');
    }
  };

  const removeTarget = async (target: string) => {
    const ok = await mutateTargets(targets.filter((t) => t !== target));
    if (ok) setSuccess('Target removed');
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a href="/dashboard" className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-bold text-base">Target Management</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Add target */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 sm:p-6">
            <h3 className="card-title gap-2 text-base">
              <Plus className="w-5 h-5 text-primary" />
              Add Target
            </h3>
            <form onSubmit={addTarget} className="flex flex-col sm:flex-row gap-2">
              <input
                className="input input-bordered flex-1"
                placeholder="https://example.com"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              />
              <button type="submit" className="btn btn-primary gap-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </form>

            {error && (
              <div className="alert alert-error py-2 mt-2 text-sm gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success py-2 mt-2 text-sm gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}
          </div>
        </div>

        {/* Target list */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 sm:p-6">
            <h3 className="card-title text-base gap-2">
              <Globe className="w-5 h-5" />
              Monitored Targets
              <span className="badge badge-neutral badge-sm">{targets.length}</span>
            </h3>
            {targets.length === 0 ? (
              <p className="text-sm opacity-50 py-2">No targets configured yet</p>
            ) : (
              <ul className="space-y-2 mt-1">
                {targets.map((t) => (
                  <li
                    key={t}
                    className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2 gap-2"
                  >
                    <span className="text-sm font-mono break-all">{t}</span>
                    <button
                      className="btn btn-ghost btn-xs text-error shrink-0 gap-1"
                      onClick={() => removeTarget(t)}
                      disabled={loading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
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
