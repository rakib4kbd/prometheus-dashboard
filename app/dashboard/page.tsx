'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Stats {
  totalAlerts: number;
  firingAlerts: number;
  totalTargets: number;
  impactedTargets: number;
}

interface AlertRow {
  alert_name: string;
  instance: string;
  status: string;
  starts_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [firing, setFiring] = useState<AlertRow[]>([]);
  const [recent, setRecent] = useState<AlertRow[]>([]);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, statsRes, alertsRes] = await Promise.all([
          axios.get('/api/auth/me'),
          axios.get('/api/stats'),
          axios.get('/api/alerts'),
        ]);
        setUsername(meRes.data.username);
        setRole(meRes.data.role);
        setStats(statsRes.data);
        setFiring(alertsRes.data.firing || []);
        setRecent(alertsRes.data.recent || []);
      } catch {
        router.push('/');
      }
    };
    load();
  }, [router]);

  const logout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/');
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1 font-bold text-lg">Prometheus Dashboard</div>
        <div className="flex-none flex items-center gap-3">
          <span className="text-sm opacity-60">{username}</span>
          {role === 'admin' && (
            <a href="/admin" className="btn btn-ghost btn-sm">Admin</a>
          )}
          <a href="/settings" className="btn btn-ghost btn-sm">Targets</a>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title">Firing Alerts</div>
            <div className="stat-value text-error">{stats.firingAlerts}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title">Total Alerts</div>
            <div className="stat-value">{stats.totalAlerts}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title">Total Targets</div>
            <div className="stat-value text-info">{stats.totalTargets}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title">Impacted Targets</div>
            <div className="stat-value text-warning">{stats.impactedTargets}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="card-title text-error">Firing Alerts</h3>
              {firing.length === 0 ? (
                <p className="text-success text-sm">No active alerts</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Alert</th>
                        <th>Instance</th>
                        <th>Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firing.map((a, i) => (
                        <tr key={i}>
                          <td className="font-medium">{a.alert_name}</td>
                          <td className="text-xs opacity-70 font-mono">{a.instance}</td>
                          <td className="text-xs">{new Date(a.starts_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Recent Incidents (30 days)</h3>
              {recent.length === 0 ? (
                <p className="text-sm opacity-60">No recent incidents</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Alert</th>
                        <th>Instance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((a, i) => (
                        <tr key={i}>
                          <td className="font-medium">{a.alert_name}</td>
                          <td className="text-xs opacity-70 font-mono">{a.instance}</td>
                          <td>
                            <span
                              className={`badge badge-sm ${
                                a.status === 'firing' ? 'badge-error' : 'badge-success'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
