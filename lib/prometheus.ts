import axios from 'axios';
import { PrometheusAlert } from '@/types';

const client = axios.create({
  baseURL: `${process.env.PROMETHEUS_URL}/api/v1`,
  timeout: 10000,
});

export async function getAlerts(): Promise<PrometheusAlert[]> {
  const res = await client.get('/alerts');
  return res.data.data?.alerts || [];
}

export async function query(promql: string) {
  const res = await client.get('/query', { params: { query: promql } });
  return res.data.data;
}

export async function queryRange(promql: string, start: string, end: string, step: string) {
  const res = await client.get('/query_range', { params: { query: promql, start, end, step } });
  return res.data.data;
}

export async function reloadConfig() {
  await axios.post(`${process.env.PROMETHEUS_URL}/-/reload`);
}
