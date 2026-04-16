import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getVersions } from '@/lib/configManager';

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const versions = await getVersions();
  return NextResponse.json(versions);
}
