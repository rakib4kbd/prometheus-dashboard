import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { readConfigRaw, rollbackToVersion } from '@/lib/configManager';

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ config: readConfigRaw() });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { version } = await req.json();
  if (!version) return NextResponse.json({ error: 'version required' }, { status: 400 });

  try {
    await rollbackToVersion(Number(version));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Rollback failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
