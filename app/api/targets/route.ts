import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getTargets, updateTargets } from '@/lib/configManager';

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targets = await getTargets(user.username);
  return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targets } = await req.json();
  if (!Array.isArray(targets)) {
    return NextResponse.json({ error: 'targets must be an array' }, { status: 400 });
  }

  try {
    await updateTargets(user.username, targets);
    const updated = await getTargets(user.username);
    return NextResponse.json({ targets: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update targets';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
