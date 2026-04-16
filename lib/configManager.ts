import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';
import pool from './db';
import { reloadConfig } from './prometheus';
import { PrometheusConfig, ScrapeJob } from '@/types';

const execAsync = promisify(exec);
const CONFIG_PATH = process.env.PROMETHEUS_CONFIG_PATH || './configs/prometheus.yml';
const BACKUP_DIR = path.join(path.dirname(path.resolve(CONFIG_PATH)), 'backups');
const MAX_BACKUPS = 10;

function readConfig(): PrometheusConfig {
  return yaml.load(fs.readFileSync(path.resolve(CONFIG_PATH), 'utf8')) as PrometheusConfig;
}

function writeConfig(config: PrometheusConfig) {
  fs.writeFileSync(path.resolve(CONFIG_PATH), yaml.dump(config, { lineWidth: -1 }));
}

async function saveBackup(configYaml: string): Promise<number> {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const result = await pool.query(
    'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM config_versions'
  );
  const version: number = result.rows[0].next;

  await pool.query('INSERT INTO config_versions (version, config_yaml) VALUES ($1, $2)', [
    version,
    configYaml,
  ]);

  await pool.query(
    'DELETE FROM config_versions WHERE id NOT IN (SELECT id FROM config_versions ORDER BY created_at DESC LIMIT $1)',
    [MAX_BACKUPS]
  );

  fs.writeFileSync(path.join(BACKUP_DIR, `prometheus_v${version}.yml`), configYaml);

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('prometheus_v') && f.endsWith('.yml'))
    .sort();
  while (files.length > MAX_BACKUPS) {
    fs.unlinkSync(path.join(BACKUP_DIR, files.shift()!));
  }

  return version;
}

async function validateAndReload(): Promise<void> {
  try {
    await execAsync(`promtool check config "${path.resolve(CONFIG_PATH)}"`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Config validation failed: ${msg}`);
  }
  await reloadConfig();
}

export async function addUserJob(username: string): Promise<void> {
  const config = readConfig();
  if (config.scrape_configs.some((j) => j.job_name === username)) return;

  const originalYaml = yaml.dump(config, { lineWidth: -1 });

  const job: ScrapeJob = {
    job_name: username,
    metrics_path: '/probe',
    params: { module: ['http_default'] },
    static_configs: [{ targets: [], labels: { username } }],
    relabel_configs: [
      { source_labels: ['__address__'], target_label: '__param_target' },
      { source_labels: ['__param_target'], target_label: 'instance' },
      { target_label: '__address__', replacement: 'blackbox:9115' },
    ],
  };

  config.scrape_configs.push(job);
  writeConfig(config);

  try {
    await validateAndReload();
    await saveBackup(yaml.dump(config, { lineWidth: -1 }));
  } catch (err) {
    writeConfig(yaml.load(originalYaml) as PrometheusConfig);
    throw err;
  }
}

export async function getTargets(username: string): Promise<string[]> {
  const config = readConfig();
  const job = config.scrape_configs.find((j) => j.job_name === username);
  return job?.static_configs[0]?.targets || [];
}

export async function updateTargets(username: string, targets: string[]): Promise<void> {
  const config = readConfig();
  const originalYaml = yaml.dump(config, { lineWidth: -1 });
  const job = config.scrape_configs.find((j) => j.job_name === username);
  if (!job) throw new Error('Job not found for user');

  job.static_configs[0].targets = [...new Set(targets)];
  writeConfig(config);

  try {
    await validateAndReload();
    await saveBackup(yaml.dump(config, { lineWidth: -1 }));
  } catch (err) {
    writeConfig(yaml.load(originalYaml) as PrometheusConfig);
    throw err;
  }
}

export async function getVersions() {
  const result = await pool.query(
    'SELECT id, version, created_at FROM config_versions ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function rollbackToVersion(version: number): Promise<void> {
  const result = await pool.query(
    'SELECT config_yaml FROM config_versions WHERE version = $1',
    [version]
  );
  if (result.rows.length === 0) throw new Error('Version not found');

  const originalYaml = fs.readFileSync(path.resolve(CONFIG_PATH), 'utf8');
  const rollbackYaml: string = result.rows[0].config_yaml;

  fs.writeFileSync(path.resolve(CONFIG_PATH), rollbackYaml);

  try {
    await validateAndReload();
    await saveBackup(rollbackYaml);
  } catch (err) {
    fs.writeFileSync(path.resolve(CONFIG_PATH), originalYaml);
    throw err;
  }
}

export function readConfigRaw(): string {
  return fs.readFileSync(path.resolve(CONFIG_PATH), 'utf8');
}
