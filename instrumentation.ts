export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDB } = await import('./lib/db');
    const { startPoller } = await import('./lib/alertPoller');
    const { startCacheRefresh } = await import('./lib/cache');
    try {
      await initDB();
      startPoller();
      startCacheRefresh();
    } catch (err) {
      console.error('[instrumentation] startup error:', err);
    }
  }
}
