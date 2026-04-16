import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAlerts } from "@/lib/prometheus";
import { getTargets } from "@/lib/configManager";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [allAlerts, targets] = await Promise.all([
    getAlerts(),
    getTargets(user.username),
  ]);

  const userAlerts = allAlerts.filter(
    (a) => a.labels.username === user.username,
  );
  const firingAlerts = userAlerts.filter((a) => a.state === "firing");
  const impactedTargets = new Set(
    firingAlerts.map((a) => a.labels.instance || ""),
  ).size;

  return NextResponse.json({
    totalAlerts: userAlerts.length,
    firingAlerts: firingAlerts.length,
    totalTargets: targets.length,
    impactedTargets,
  });
}
