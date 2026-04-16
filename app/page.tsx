'use client';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Globe, LogIn, UserPlus, User, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`/api/auth/${mode}`, form);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) ? err.response?.data?.error : 'Something went wrong';
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body p-6 sm:p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-7 h-7 text-primary" />
            <h2 className="text-2xl font-bold">Prometheus</h2>
          </div>
          <p className="text-sm opacity-50 mb-4">Multi-user monitoring dashboard</p>

          {/* Tabs */}
          <div className="tabs tabs-boxed mb-5">
            <button
              className={`tab flex-1 gap-2 ${mode === 'login' ? 'tab-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              className={`tab flex-1 gap-2 ${mode === 'register' ? 'tab-active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="input input-bordered flex items-center gap-2">
              <User className="w-4 h-4 opacity-40 shrink-0" />
              <input
                className="grow"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </label>

            {mode === 'register' && (
              <label className="input input-bordered flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-40 shrink-0" />
                <input
                  type="email"
                  className="grow"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
            )}

            <label className="input input-bordered flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-40 shrink-0" />
              <input
                type="password"
                className="grow"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>

            {error && (
              <div className="alert alert-error py-2 text-sm gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full gap-2 mt-1" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
