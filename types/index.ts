export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: Date;
}

export interface AlertEvent {
  id: number;
  fingerprint: string;
  username: string;
  alert_name: string;
  instance: string;
  status: 'firing' | 'resolved';
  starts_at: Date;
  ends_at: Date | null;
  last_sent_at: Date | null;
}

export interface ConfigVersion {
  id: number;
  version: number;
  config_yaml: string;
  created_at: Date;
}

export interface PrometheusAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: 'firing' | 'pending' | 'inactive';
  activeAt: string;
  value: string;
}

export interface CacheData {
  alerts: PrometheusAlert[];
  stats: Record<string, unknown>;
  targets: Record<string, string[]>;
  updatedAt: Date | null;
}

export interface PrometheusConfig {
  global: { scrape_interval: string };
  scrape_configs: ScrapeJob[];
  rule_files?: string[];
  alerting?: unknown;
}

export interface ScrapeJob {
  job_name: string;
  metrics_path?: string;
  params?: Record<string, string[]>;
  static_configs: StaticConfig[];
  relabel_configs?: RelabelConfig[];
}

export interface StaticConfig {
  targets: string[];
  labels?: Record<string, string>;
}

export interface RelabelConfig {
  source_labels?: string[];
  target_label: string;
  replacement?: string;
}
