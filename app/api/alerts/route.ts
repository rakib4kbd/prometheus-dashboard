import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getCacheOrRefresh } from "@/lib/cache";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cache = await getCacheOrRefresh();
  const firing = cache.alerts
    .filter((a) => a.state === "firing" && a.labels.username === user.username)
    .map((a) => ({
      alert_name: a.labels.alertname,
      instance: a.labels.instance || "",
      status: "firing",
      starts_at: a.activeAt,
    }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await pool.query(
    `SELECT alert_name, instance, status, starts_at
     FROM alert_events
     WHERE username = $1 AND starts_at >= $2
     ORDER BY starts_at DESC LIMIT 100`,
    [user.username, thirtyDaysAgo],
  );

  return NextResponse.json({ firing, recent: result.rows });
}
