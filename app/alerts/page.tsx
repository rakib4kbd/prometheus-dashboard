"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  LogOut,
  Globe,
  Tag,
  Info,
} from "lucide-react";
import { PrometheusAlert } from "@/types";
import Link from "next/link";

interface RecentAlert {
  alert_name: string;
  instance: string;
  status: string;
  starts_at: string;
}

const PAGE_SIZE = 10;

function stateBadge(state: string) {
  const map: Record<string, string> = {
    firing: "badge-error",
    pending: "badge-warning",
    resolved: "badge-success",
    inactive: "badge-ghost",
  };
  return (
    <span
      className={`badge badge-sm font-medium ${map[state] ?? "badge-ghost"}`}
    >
      {state}
    </span>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Alerts page inner (needs useSearchParams) ────────────────────────────────

function AlertsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [alerts, setAlerts] = useState<PrometheusAlert[]>([]);
  const [recent, setRecent] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [stateFilter, setStateFilter] = useState(
    searchParams.get("filter") ?? "all",
  );
  const [tab, setTab] = useState<"active" | "history">(
    searchParams.get("filter") === "history" ? "history" : "active",
  );

  // pagination
  const [page, setPage] = useState(0);

  // expandable rows — keyed by tab+index to avoid cross-tab collisions
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  // Reset page + expanded when filters change
  useEffect(() => {
    setPage(0);
    setExpanded(new Set());
  }, [nameFilter, stateFilter, tab]);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const [meRes, alertsRes] = await Promise.all([
          axios.get("/api/auth/me"),
          axios.get("/api/alerts"),
        ]);
        setUsername(meRes.data.username);
        setAlerts(alertsRes.data.alerts ?? []);
        setRecent(alertsRes.data.recent ?? []);
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

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredActive = alerts.filter((a) => {
    const nameMatch = a.labels.alertname
      ?.toLowerCase()
      .includes(nameFilter.toLowerCase());
    const stateMatch = stateFilter === "all" || a.state === stateFilter;
    return nameMatch && stateMatch;
  });

  const filteredHistory = recent.filter((r) => {
    const nameMatch = r.alert_name
      .toLowerCase()
      .includes(nameFilter.toLowerCase());
    const stateMatch = stateFilter === "all" || r.status === stateFilter;
    return nameMatch && stateMatch;
  });

  const activeList = filteredActive.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const historyList = filteredHistory.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const totalPages =
    tab === "active"
      ? Math.ceil(filteredActive.length / PAGE_SIZE)
      : Math.ceil(filteredHistory.length / PAGE_SIZE);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
          <Bell className="w-5 h-5 text-primary hidden sm:block" />
          <span className="font-bold text-base hidden sm:inline">Alerts</span>
        </div>
        <div className="flex-none flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:flex items-center gap-1 text-sm opacity-50">
            {username}
          </span>
          <button className="btn btn-ghost btn-sm gap-1" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerts
            </h1>
            {checkedAt && (
              <p className="text-xs opacity-40 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> checked{" "}
                {relativeTime(checkedAt.toISOString())}
              </p>
            )}
          </div>
          <button
            className="btn btn-sm btn-ghost gap-1 self-start sm:self-auto"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed w-fit">
          <button
            className={`tab gap-2 ${tab === "active" ? "tab-active" : ""}`}
            onClick={() => setTab("active")}
          >
            <AlertTriangle className="w-4 h-4" />
            Active
            <span className="badge badge-sm">{filteredActive.length}</span>
          </button>
          <button
            className={`tab gap-2 ${tab === "history" ? "tab-active" : ""}`}
            onClick={() => setTab("history")}
          >
            <Clock className="w-4 h-4" />
            History (30d)
            <span className="badge badge-sm">{filteredHistory.length}</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 opacity-40 shrink-0" />
            <input
              className="grow"
              placeholder="Filter by alert name…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </label>
          <select
            className="select select-bordered select-sm w-full sm:w-40"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="all">All states</option>
            <option value="firing">Firing</option>
            <option value="pending">Pending</option>
            {tab === "history" && <option value="resolved">Resolved</option>}
          </select>
        </div>

        {/* Table */}
        <div className="card bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Alert</th>
                  <th>Instance</th>
                  <th>Since</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {tab === "active" && activeList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 opacity-40">
                      No active alerts match the current filter
                    </td>
                  </tr>
                )}
                {tab === "active" &&
                  activeList.map((a, i) => (
                    <ActiveRow
                      key={i}
                      alert={a}
                      index={i}
                      expanded={expanded.has(i)}
                      onToggle={() => toggle(i)}
                    />
                  ))}

                {tab === "history" && historyList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 opacity-40">
                      No history matches the current filter
                    </td>
                  </tr>
                )}
                {tab === "history" &&
                  historyList.map((r, i) => (
                    <HistoryRow
                      key={i}
                      row={r}
                      index={i}
                      expanded={expanded.has(i)}
                      onToggle={() => toggle(i)}
                    />
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

// ── Row components ───────────────────────────────────────────────────────────

function ActiveRow({
  alert: a,
  index,
  expanded,
  onToggle,
}: {
  alert: PrometheusAlert;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover cursor-pointer" onClick={onToggle}>
        <td>
          <ChevronDown
            className={`w-4 h-4 opacity-40 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </td>
        <td className="font-medium">{a.labels.alertname ?? "—"}</td>
        <td className="font-mono text-xs opacity-70 max-w-[200px] truncate">
          {a.labels.instance ?? a.labels.target ?? "—"}
        </td>
        <td className="text-xs whitespace-nowrap">
          {relativeTime(a.activeAt)}
        </td>
        <td>{stateBadge(a.state)}</td>
      </tr>
      {expanded && (
        <tr className="bg-base-200">
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="flex items-center gap-1 font-semibold opacity-50 mb-2 text-xs uppercase tracking-wide">
                  <Tag className="w-3.5 h-3.5" /> Labels
                </p>
                <div className="space-y-1">
                  {Object.entries(a.labels).map(([k, v]) => (
                    <div key={k} className="flex gap-2 font-mono text-xs">
                      <span className="opacity-50 shrink-0">{k}:</span>
                      <span className="break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {Object.keys(a.annotations).length > 0 && (
                  <div>
                    <p className="flex items-center gap-1 font-semibold opacity-50 mb-2 text-xs uppercase tracking-wide">
                      <Info className="w-3.5 h-3.5" /> Annotations
                    </p>
                    <div className="space-y-1">
                      {Object.entries(a.annotations).map(([k, v]) => (
                        <div key={k} className="font-mono text-xs">
                          <span className="opacity-50">{k}: </span>
                          <span className="break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs opacity-50 uppercase tracking-wide font-semibold mb-1">
                    Active since
                  </p>
                  <p className="text-xs font-mono">
                    {new Date(a.activeAt).toLocaleString()}
                  </p>
                </div>
                {a.value !== undefined && (
                  <div>
                    <p className="text-xs opacity-50 uppercase tracking-wide font-semibold mb-1">
                      Value
                    </p>
                    <p className="text-xs font-mono">{a.value}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function HistoryRow({
  row: r,
  index,
  expanded,
  onToggle,
}: {
  row: RecentAlert;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover cursor-pointer" onClick={onToggle}>
        <td>
          <ChevronDown
            className={`w-4 h-4 opacity-40 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </td>
        <td className="font-medium">{r.alert_name}</td>
        <td className="font-mono text-xs opacity-70 max-w-[200px] truncate">
          {r.instance}
        </td>
        <td className="text-xs whitespace-nowrap">
          {new Date(r.starts_at).toLocaleString()}
        </td>
        <td>{stateBadge(r.status)}</td>
      </tr>
      {expanded && (
        <tr className="bg-base-200">
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs opacity-50 uppercase tracking-wide font-semibold mb-1">
                  Instance
                </p>
                <p className="font-mono text-xs break-all">{r.instance}</p>
              </div>
              <div>
                <p className="text-xs opacity-50 uppercase tracking-wide font-semibold mb-1">
                  Recorded at
                </p>
                <p className="font-mono text-xs">
                  {new Date(r.starts_at).toLocaleString()}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page export with Suspense (required for useSearchParams) ─────────────────

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
