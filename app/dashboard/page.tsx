'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Globe,
  WifiOff,
  RefreshCw,
  LogOut,
  Settings,
  Shield,
  User,
  CheckCircle,
  Clock,
} from 'lucide-react';

const POLL_INTERVAL = 30_000; // 30 seconds

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
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const router = useRouter();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
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
      setUpdatedAt(new Date());
    } catch {
      router.push('/');
    } finally {
      if (manual) setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

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
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1 gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-bold text-base hidden sm:inline">Prometheus Dashboard</span>
          <span className="font-bold text-base sm:hidden">PrometheusDB</span>
        </div>
        <div className="flex-none flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:flex items-center gap-1 text-sm opacity-60">
            <User className="w-3.5 h-3.5" />
            {username}
          </span>
          {role === 'admin' && (
            <a href="/admin" className="btn btn-ghost btn-sm gap-1">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </a>
          )}
          <a href="/settings" className="btn btn-ghost btn-sm gap-1">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Targets</span>
          </a>
          <button className="btn btn-ghost btn-sm gap-1" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl font-bold">Overview</h1>
          <div className="flex items-center gap-3">
            {updatedAt && (
              <span className="flex items-center gap-1 text-xs opacity-50">
                <Clock className="w-3 h-3" />
                {updatedAt.toLocaleTimeString()}
              </span>
            )}
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-figure text-error">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Firing Alerts</div>
            <div className="stat-value text-error text-2xl sm:text-3xl">{stats.firingAlerts}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-figure text-base-content opacity-40">
              <Bell className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Alerts</div>
            <div className="stat-value text-2xl sm:text-3xl">{stats.totalAlerts}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-figure text-info">
              <Globe className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Targets</div>
            <div className="stat-value text-info text-2xl sm:text-3xl">{stats.totalTargets}</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-figure text-warning">
              <WifiOff className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Impacted</div>
            <div className="stat-value text-warning text-2xl sm:text-3xl">{stats.impactedTargets}</div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firing alerts */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <h3 className="card-title text-base gap-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                Firing Alerts
              </h3>
              {firing.length === 0 ? (
                <div className="flex items-center gap-2 text-success text-sm py-4">
                  <CheckCircle className="w-4 h-4" />
                  No active alerts
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
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
                        <tr key={i} className="hover">
                          <td className="font-medium">{a.alert_name}</td>
                          <td className="text-xs font-mono opacity-70 max-w-[120px] truncate">{a.instance}</td>
                          <td className="text-xs whitespace-nowrap">{new Date(a.starts_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent incidents */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <h3 className="card-title text-base gap-2">
                <Bell className="w-5 h-5" />
                Recent Incidents
                <span className="text-xs font-normal opacity-50">(30 days)</span>
              </h3>
              {recent.length === 0 ? (
                <p className="text-sm opacity-50 py-4">No recent incidents</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
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
                        <tr key={i} className="hover">
                          <td className="font-medium">{a.alert_name}</td>
                          <td className="text-xs font-mono opacity-70 max-w-[120px] truncate">{a.instance}</td>
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
