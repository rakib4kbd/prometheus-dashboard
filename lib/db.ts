import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id SERIAL PRIMARY KEY,
      fingerprint VARCHAR(64) UNIQUE NOT NULL,
      username VARCHAR(50) NOT NULL,
      alert_name VARCHAR(255) NOT NULL,
      instance VARCHAR(500) NOT NULL,
      status VARCHAR(20) NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      last_sent_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS config_versions (
      id SERIAL PRIMARY KEY,
      version INTEGER NOT NULL,
      config_yaml TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export default pool;
