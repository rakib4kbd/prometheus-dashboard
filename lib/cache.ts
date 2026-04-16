import { getAlerts } from './prometheus';
import { getTargets } from './configManager';
import pool from './db';
import { CacheData } from '@/types';

const CACHE_TTL = 5 * 60 * 1000;

let cache: CacheData = { alerts: [], stats: {}, targets: {}, updatedAt: null };
let refreshTimer: NodeJS.Timeout | null = null;

export async function refreshCache() {
  try {
    const [alerts, usersResult] = await Promise.all([
      getAlerts(),
      pool.query('SELECT username FROM users'),
    ]);

    const targets: Record<string, string[]> = {};
    for (const { username } of usersResult.rows) {
      targets[username] = await getTargets(username);
    }

    const allTargetCount = Object.values(targets).reduce((s, t) => s + t.length, 0);
    const firingAlerts = alerts.filter((a) => a.state === 'firing');

    cache = {
      alerts,
      stats: {
        totalAlerts: alerts.length,
        firingAlerts: firingAlerts.length,
        totalTargets: allTargetCount,
        targetsByUser: Object.fromEntries(
          Object.entries(targets).map(([u, t]) => [u, t.length])
        ),
      },
      targets,
      updatedAt: new Date(),
    };
  } catch (err) {
    console.error('[cache] refresh error:', err);
  }
}

export function getCache(): CacheData {
  return cache;
}

export function startCacheRefresh() {
  if (refreshTimer) return;
  refreshCache();
  refreshTimer = setInterval(refreshCache, CACHE_TTL);
}
