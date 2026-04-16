import { getAlerts } from "./prometheus";
import { getTargets } from "./configManager";
import pool from "./db";
import { CacheData } from "@/types";

const CACHE_TTL = 30 * 1000;       // background refresh interval
const CACHE_STALE_MS = 60 * 1000;  // treat as stale if older than this

// Use global to survive hot-module reloads in development
const g = global as typeof globalThis & {
  __prom_cache: CacheData;
  __prom_timer: NodeJS.Timeout | null;
  __prom_refreshing: boolean;
};

if (!g.__prom_cache) {
  g.__prom_cache = { alerts: [], stats: {}, targets: {}, updatedAt: null };
}
if (g.__prom_timer === undefined) {
  g.__prom_timer = null;
}
if (g.__prom_refreshing === undefined) {
  g.__prom_refreshing = false;
}

export async function refreshCache(): Promise<void> {
  // Prevent concurrent refreshes
  if (g.__prom_refreshing) return;
  g.__prom_refreshing = true;
  try {
    const [alerts, usersResult] = await Promise.all([
      getAlerts(),
      pool.query("SELECT username FROM users"),
    ]);

    const targets: Record<string, string[]> = {};
    for (const { username } of usersResult.rows) {
      targets[username] = await getTargets(username);
    }

    const allTargetCount = Object.values(targets).reduce(
      (s, t) => s + t.length,
      0,
    );

    const firingAlerts = alerts.filter((a) => a.state === "firing");

    g.__prom_cache = {
      alerts,
      stats: {
        totalAlerts: alerts.length,
        firingAlerts: firingAlerts.length,
        totalTargets: allTargetCount,
        targetsByUser: Object.fromEntries(
          Object.entries(targets).map(([u, t]) => [u, t.length]),
        ),
      },
      targets,
      updatedAt: new Date(),
    };
  } catch (err) {
    console.error("[cache] refresh error:", err);
  } finally {
    g.__prom_refreshing = false;
  }
}

export function getCache(): CacheData {
  return g.__prom_cache;
}

/**
 * Returns the cache, triggering an immediate refresh if the data is missing
 * or stale (older than CACHE_STALE_MS). This ensures routes always get fresh
 * data even when the background timer hasn't fired yet (e.g. cold start).
 */
export async function getCacheOrRefresh(): Promise<CacheData> {
  const age = g.__prom_cache.updatedAt
    ? Date.now() - new Date(g.__prom_cache.updatedAt).getTime()
    : Infinity;

  if (age > CACHE_STALE_MS) {
    await refreshCache();
  }
  return g.__prom_cache;
}

export function startCacheRefresh() {
  if (g.__prom_timer) return;
  refreshCache();
  g.__prom_timer = setInterval(refreshCache, CACHE_TTL);
}
