import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAlerts } from "@/lib/prometheus";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [allAlerts, dbResult] = await Promise.all([
    getAlerts(),
    pool.query(
      `SELECT alert_name, instance, status, starts_at
       FROM alert_events
       WHERE username = $1 AND starts_at >= NOW() - INTERVAL '30 days'
       ORDER BY starts_at DESC LIMIT 100`,
      [user.username],
    ),
  ]);

  // Return full PrometheusAlert objects so the UI can access labels/annotations
  const alerts = allAlerts.filter((a) => a.labels.username === user.username);

  return NextResponse.json({ alerts, recent: dbResult.rows });
}
