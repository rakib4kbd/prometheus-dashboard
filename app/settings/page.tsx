"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  RefreshCw,
  Clock,
  LogOut,
  X,
} from "lucide-react";
import { PrometheusAlert } from "@/types";
import Link from "next/link";

interface TargetRow {
  url: string;
  status: "firing" | "healthy";
  alerts: PrometheusAlert[];
}

const PAGE_SIZE = 10;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SettingsPage() {
  const router = useRouter();

  const [targets, setTargets] = useState<string[]>([]);
  const [allAlerts, setAllAlerts] = useState<PrometheusAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add-target form
  const [showAdd, setShowAdd] = useState(false);
  const [newTarget, setNewTarget] = useState("");

  // Filters
  const [urlFilter, setUrlFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "firing" | "healthy"
  >("all");

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

  useEffect(() => {
    setPage(0);
    setExpanded(new Set());
  }, [urlFilter, statusFilter]);

  // Auto-dismiss success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const [targetsRes, alertsRes] = await Promise.all([
          axios.get("/api/targets"),
          axios.get("/api/alerts"),
        ]);
        setTargets(targetsRes.data ?? []);
        setAllAlerts(alertsRes.data.alerts ?? []);
        setCheckedAt(new Date());
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
        if (manual) setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await axios.post("/api/auth/logout");
    router.push("/");
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const mutateTargets = async (updated: string[]): Promise<boolean> => {
    setMutating(true);
    setError("");
    try {
      const res = await axios.post("/api/targets", { targets: updated });
      setTargets(res.data.targets);
      return true;
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : "Operation failed";
      setError(msg || "Operation failed");
      return false;
    } finally {
      setMutating(false);
    }
  };

  const addTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim()) return;
    const ok = await mutateTargets([...targets, newTarget.trim()]);
    if (ok) {
      setNewTarget("");
      setShowAdd(false);
      setSuccess("Target added");
      load();
    }
  };

  const removeTarget = async (url: string) => {
    const ok = await mutateTargets(targets.filter((t) => t !== url));
    if (ok) {
      setSuccess("Target removed");
      load();
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const targetRows: TargetRow[] = targets.map((url) => {
    const alerts = allAlerts.filter((a) => a.labels.instance === url);
    return {
      url,
      status: alerts.some((a) => a.state === "firing") ? "firing" : "healthy",
      alerts,
    };
  });

  const filtered = targetRows.filter((t) => {
    const urlMatch = t.url.toLowerCase().includes(urlFilter.toLowerCase());
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    return urlMatch && statusMatch;
  });

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const firingCount = targetRows.filter((t) => t.status === "firing").length;

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
          <Link href="/dashboard" className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="divider divider-horizontal mx-0 hidden sm:flex" />
          <Globe className="w-5 h-5 text-primary hidden sm:block" />
          <span className="font-bold text-base hidden sm:inline">
            Target Management
          </span>
        </div>
        <div className="flex-none flex items-center gap-1">
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Targets
              <span className="badge badge-neutral badge-sm">
                {targets.length}
              </span>
              {firingCount > 0 && (
                <span className="badge badge-error badge-sm gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {firingCount} firing
                </span>
              )}
            </h1>
            {checkedAt && (
              <p className="text-xs opacity-40 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> checked{" "}
                {relativeTime(checkedAt.toISOString())}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              className="btn btn-sm btn-primary gap-1"
              onClick={() => setShowAdd((v) => !v)}
            >
              {showAdd ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {showAdd ? "Cancel" : "Add Target"}
            </button>
          </div>
        </div>

        {/* Add target inline form */}
        {showAdd && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Add new target
              </h3>
              <form
                onSubmit={addTarget}
                className="flex flex-col sm:flex-row gap-2 mt-1"
              >
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder="https://example.com"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm gap-1"
                  disabled={mutating || !newTarget.trim()}
                >
                  {mutating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="alert alert-error py-2 text-sm gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button className="ml-auto" onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="alert alert-success py-2 text-sm gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

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
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
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
                  <th>Target URL</th>
                  <th className="w-28">Status</th>
                  <th className="w-24 hidden sm:table-cell">Alerts</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 opacity-40">
                      {targets.length === 0
                        ? "No targets yet — add one above"
                        : "No targets match the current filter"}
                    </td>
                  </tr>
                )}
                {pageItems.map((t, i) => (
                  <>
                    <tr key={`row-${i}`} className="hover">
                      <td className="cursor-pointer" onClick={() => toggle(i)}>
                        <ChevronDown
                          className={`w-4 h-4 opacity-40 transition-transform duration-200 ${
                            expanded.has(i) ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                      <td
                        className="font-mono text-sm break-all max-w-xs cursor-pointer"
                        onClick={() => toggle(i)}
                      >
                        {t.url}
                      </td>
                      <td className="cursor-pointer" onClick={() => toggle(i)}>
                        {t.status === "firing" ? (
                          <span className="badge badge-error gap-1">
                            <AlertTriangle className="w-3 h-3" /> Firing
                          </span>
                        ) : (
                          <span className="badge badge-success gap-1">
                            <CheckCircle className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>
                      <td
                        className="hidden sm:table-cell text-sm cursor-pointer"
                        onClick={() => toggle(i)}
                      >
                        {t.alerts.length > 0 ? (
                          <span className="font-medium text-error">
                            {t.alerts.length}
                          </span>
                        ) : (
                          <span className="opacity-30">0</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs text-error gap-1"
                          onClick={() => removeTarget(t.url)}
                          disabled={mutating}
                          title="Remove target"
                        >
                          {mutating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Remove</span>
                        </button>
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
                            <div className="space-y-2">
                              <p className="text-xs opacity-50 font-semibold uppercase tracking-wide mb-2">
                                Active Alerts
                              </p>
                              <div className="overflow-x-auto">
                                <table className="table table-xs bg-base-100 rounded-lg">
                                  <thead>
                                    <tr>
                                      <th>Alert</th>
                                      <th>State</th>
                                      <th>Since</th>
                                      <th>Summary</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {t.alerts.map((a, ai) => (
                                      <tr key={ai}>
                                        <td className="font-medium">
                                          {a.labels.alertname}
                                        </td>
                                        <td>
                                          <span
                                            className={`badge badge-xs ${
                                              a.state === "firing"
                                                ? "badge-error"
                                                : "badge-warning"
                                            }`}
                                          >
                                            {a.state}
                                          </span>
                                        </td>
                                        <td className="text-xs whitespace-nowrap">
                                          {relativeTime(a.activeAt)}
                                        </td>
                                        <td className="text-xs opacity-60 max-w-xs truncate">
                                          {a.annotations.summary ??
                                            a.annotations.description ??
                                            "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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
