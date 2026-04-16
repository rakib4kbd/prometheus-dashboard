import { createHash } from "crypto";
import { getAlerts } from "./prometheus";
import pool from "./db";
import { sendAlertEmail, AlertEmailOptions } from "./mailer";
import { PrometheusAlert } from "@/types";

const POLL_INTERVAL = 60 * 1000;
const EMAIL_THROTTLE = 10 * 60 * 1000;
const MAX_RETRIES = 1;

let pollerTimer: NodeJS.Timeout | null = null;

function fingerprint(
  username: string,
  alertName: string,
  instance: string,
): string {
  return createHash("sha256")
    .update(`${username}${alertName}${instance}`)
    .digest("hex");
}

async function sendWithRetry(
  to: string,
  alertName: string,
  instance: string,
  status: "firing" | "resolved",
  opts: AlertEmailOptions = {},
) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await sendAlertEmail(to, alertName, instance, status, opts);
      return;
    } catch {
      if (i === MAX_RETRIES - 1)
        throw new Error("Email send failed after retries");
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function processAlerts() {
  let alerts: PrometheusAlert[];
  try {
    alerts = await getAlerts();
  } catch {
    return;
  }

  for (const alert of alerts) {
    const username = alert.labels.username;
    if (!username) continue;

    const alertName = alert.labels.alertname || "UnknownAlert";
    const instance = alert.labels.instance || alert.labels.target || "";
    // Skip pending alerts — condition is met but `for` duration hasn't elapsed.
    // Treating pending as resolved caused false "resolved" emails.
    if (alert.state === "pending") continue;
    const status = alert.state === "firing" ? "firing" : "resolved";
    const fp = fingerprint(username, alertName, instance);
    const now = new Date();
    const startsAt = new Date(alert.activeAt || now);

    const existing = await pool.query(
      "SELECT status, last_sent_at FROM alert_events WHERE fingerprint = $1",
      [fp],
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO alert_events (fingerprint, username, alert_name, instance, status, starts_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fp, username, alertName, instance, status, startsAt],
      );
    } else {
      const prev = existing.rows[0];
      if (prev.status === status) continue;
      await pool.query(
        `UPDATE alert_events SET status = $1, ends_at = $2 WHERE fingerprint = $3`,
        [status, status === "resolved" ? now : null, fp],
      );
    }

    const userResult = await pool.query(
      "SELECT email FROM users WHERE username = $1",
      [username],
    );
    if (userResult.rows.length === 0) continue;

    const lastSentResult = await pool.query(
      "SELECT last_sent_at FROM alert_events WHERE fingerprint = $1",
      [fp],
    );
    const lastSent: Date | null = lastSentResult.rows[0]?.last_sent_at;
    if (
      lastSent &&
      now.getTime() - new Date(lastSent).getTime() < EMAIL_THROTTLE
    )
      continue;

    try {
      await sendWithRetry(
        userResult.rows[0].email,
        alertName,
        instance,
        status,
        { labels: alert.labels, annotations: alert.annotations, startsAt },
      );
      await pool.query(
        "UPDATE alert_events SET last_sent_at = $1 WHERE fingerprint = $2",
        [now, fp],
      );
    } catch {
      // silent — will retry on next poll
    }
  }
}

export function startPoller() {
  if (pollerTimer) return;
  processAlerts();
  pollerTimer = setInterval(processAlerts, POLL_INTERVAL);
}

export function stopPoller() {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
}
