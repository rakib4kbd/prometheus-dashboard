import { NextRequest, NextResponse } from 'next/server';
import { getUser } from './lib/auth';

export async function middleware(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*'],
};
