import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { addUserJob } from '@/lib/configManager';

export async function POST(req: NextRequest) {
  const { username, email, password } = await req.json();
  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [username, email, password_hash, 'user']
    );
    const user = result.rows[0];
    await addUserJob(username);
    await client.query('COMMIT');

    const token = await signToken({ id: user.id, username: user.username, role: user.role });
    return NextResponse.json({ username: user.username }, {
      status: 201,
      headers: { 'Set-Cookie': setAuthCookie(token) },
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
