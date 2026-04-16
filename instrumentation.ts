export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDB } = await import('./lib/db');
    const { startPoller } = await import('./lib/alertPoller');
    try {
      await initDB();
      startPoller();
    } catch (err) {
      console.error('[instrumentation] startup error:', err);
    }
  }
}
