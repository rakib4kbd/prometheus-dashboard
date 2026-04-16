'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Globe,
  AlertTriangle,
  Bell,
  Settings,
  LogOut,
  RefreshCw,
  Clock,
  ChevronDown,
  Search,
  CheckCircle,
  Shield,
  Tag,
  Info,
} from 'lucide-react';
import { PrometheusAlert } from '@/types';

interface TargetRow {
  url: string;
  status: 'firing' | 'healthy';
  alerts: PrometheusAlert[];
}

const PAGE_SIZE = 10;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [allAlerts, setAllAlerts] = useState<PrometheusAlert[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // Filters
  const [urlFilter, setUrlFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'firing' | 'healthy'>('all');

  // Pagination
  const [page, setPage] = useState(0);

  // Expandable rows
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  useEffect(() => { setPage(0); setExpanded(new Set()); }, [urlFilter, statusFilter]);

  const router = useRouter();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [meRes, targetsRes, alertsRes] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/targets'),
        axios.get('/api/alerts'),
      ]);
      setUsername(meRes.data.username);
      setRole(meRes.data.role);
      setTargets(targetsRes.data ?? []);
      setAllAlerts(alertsRes.data.alerts ?? []);
      setCheckedAt(new Date());
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const logout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/');
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const targetRows: TargetRow[] = targets.map((url) => {
    const alerts = allAlerts.filter((a) => a.labels.instance === url);
    return {
      url,
      status: alerts.some((a) => a.state === 'firing') ? 'firing' : 'healthy',
      alerts,
    };
  });

  const firingCount = targetRows.filter((t) => t.status === 'firing').length;
  const totalAlertCount = allAlerts.length;

  const filtered = targetRows.filter((t) => {
    const urlMatch = t.url.toLowerCase().includes(urlFilter.toLowerCase());
    const statusMatch = statusFilter === 'all' || t.status === statusFilter;
    return urlMatch && statusMatch;
  });

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-bold text-base hidden sm:inline">Prometheus</span>
        </div>
        <div className="flex-none flex items-center gap-1">
          <a href="/alerts" className="btn btn-ghost btn-sm gap-1">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </a>
          {role === 'admin' && (
            <a href="/admin" className="btn btn-ghost btn-sm gap-1">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </a>
          )}
          <span className="hidden sm:block text-sm opacity-40 px-1">{username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-5">
        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <a
            href="/alerts?filter=firing"
            className="stat bg-base-100 rounded-box shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="stat-figure text-error">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Firing Targets</div>
            <div className="stat-value text-error text-2xl sm:text-3xl">{firingCount}</div>
            <div className="stat-desc text-xs opacity-50 hidden sm:block">click to view alerts →</div>
          </a>

          <a
            href="/alerts"
            className="stat bg-base-100 rounded-box shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="stat-figure text-base-content opacity-30">
              <Bell className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Alerts</div>
            <div className="stat-value text-2xl sm:text-3xl">{totalAlertCount}</div>
            <div className="stat-desc text-xs opacity-50 hidden sm:block">click to view all →</div>
          </a>

          <a
            href="/settings"
            className="stat bg-base-100 rounded-box shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="stat-figure text-info">
              <Globe className="w-6 h-6" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Targets</div>
            <div className="stat-value text-info text-2xl sm:text-3xl">{targets.length}</div>
            <div className="stat-desc text-xs opacity-50 hidden sm:block">click to manage →</div>
          </a>
        </div>

        {/* Target list header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Monitored Targets
            {checkedAt && (
              <span className="text-xs font-normal opacity-40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {relativeTime(checkedAt.toISOString())}
              </span>
            )}
          </h2>
          <button
            className="btn btn-sm btn-ghost gap-1 self-start sm:self-auto"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 opacity-40 shrink-0" />
            <input
              className="grow"
              placeholder="Filter by URL…"
              value={urlFilter}
              onChange={(e) => setUrlFilter(e.target.value)}
            />
          </label>
          <select
            className="select select-bordered select-sm w-full sm:w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All</option>
            <option value="firing">Firing</option>
            <option value="healthy">Healthy</option>
          </select>
        </div>

        {/* Targets table */}
        <div className="card bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Target</th>
                  <th className="w-28">Status</th>
                  <th className="w-24 hidden sm:table-cell">Alerts</th>
                  <th className="w-32 hidden md:table-cell">Checked</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 opacity-40">
                      {targets.length === 0
                        ? 'No targets configured — add one in Settings'
                        : 'No targets match the current filter'}
                    </td>
                  </tr>
                )}
                {pageItems.map((t, i) => (
                  <>
                    <tr
                      key={`row-${i}`}
                      className="hover cursor-pointer"
                      onClick={() => toggle(i)}
                    >
                      <td>
                        <ChevronDown
                          className={`w-4 h-4 opacity-40 transition-transform duration-200 ${
                            expanded.has(i) ? 'rotate-180' : ''
                          }`}
                        />
                      </td>
                      <td className="font-mono text-sm break-all max-w-xs">{t.url}</td>
                      <td>
                        {t.status === 'firing' ? (
                          <span className="badge badge-error gap-1">
                            <AlertTriangle className="w-3 h-3" /> Firing
                          </span>
                        ) : (
                          <span className="badge badge-success gap-1">
                            <CheckCircle className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell text-sm">
                        {t.alerts.length > 0 ? (
                          <span className="font-medium text-error">{t.alerts.length}</span>
                        ) : (
                          <span className="opacity-30">0</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-xs opacity-40">
                        {checkedAt ? relativeTime(checkedAt.toISOString()) : '—'}
                      </td>
                    </tr>

                    {expanded.has(i) && (
                      <tr key={`expand-${i}`} className="bg-base-200">
                        <td colSpan={5} className="p-4">
                          {t.alerts.length === 0 ? (
                            <div className="flex items-center gap-2 text-success text-sm">
                              <CheckCircle className="w-4 h-4" />
                              No active alerts for this target
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {t.alerts.map((a, ai) => (
                                <div
                                  key={ai}
                                  className="bg-base-100 rounded-lg p-3 space-y-2"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-sm">
                                      {a.labels.alertname}
                                    </span>
                                    <span
                                      className={`badge badge-sm ${
                                        a.state === 'firing'
                                          ? 'badge-error'
                                          : 'badge-warning'
                                      }`}
                                    >
                                      {a.state}
                                    </span>
                                    <span className="text-xs opacity-40">
                                      since {relativeTime(a.activeAt)}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <p className="flex items-center gap-1 text-xs opacity-50 font-semibold uppercase tracking-wide mb-1">
                                        <Tag className="w-3 h-3" /> Labels
                                      </p>
                                      <div className="space-y-0.5">
                                        {Object.entries(a.labels)
                                          .filter(([k]) => !['alertname', 'instance', 'username'].includes(k))
                                          .map(([k, v]) => (
                                            <div key={k} className="font-mono text-xs flex gap-2">
                                              <span className="opacity-40 shrink-0">{k}:</span>
                                              <span>{v}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                    {Object.keys(a.annotations).length > 0 && (
                                      <div>
                                        <p className="flex items-center gap-1 text-xs opacity-50 font-semibold uppercase tracking-wide mb-1">
                                          <Info className="w-3 h-3" /> Annotations
                                        </p>
                                        {Object.entries(a.annotations).map(([k, v]) => (
                                          <div key={k} className="font-mono text-xs">
                                            <span className="opacity-40">{k}: </span>
                                            <span>{v}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="join flex justify-center">
            <button
              className="join-item btn btn-sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              «
            </button>
            <button className="join-item btn btn-sm btn-disabled pointer-events-none">
              {page + 1} / {totalPages}
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
