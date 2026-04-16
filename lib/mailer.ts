import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  service: "gmail",
});

export interface AlertEmailOptions {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  startsAt?: Date;
}

function buildEmailHtml(
  alertName: string,
  instance: string,
  status: "firing" | "resolved",
  opts: AlertEmailOptions,
): string {
  const isFiring = status === "firing";

  // DaisyUI light theme colours (inline-safe)
  const C = {
    bg: "#f2f2f2",
    card: "#ffffff",
    border: "#e5e5e5",
    primary: "#570df8",
    error: "#ff5861",
    errorBg: "#fff0f1",
    success: "#36d399",
    successBg: "#f0fdf7",
    text: "#1f2937",
    muted: "#6b7280",
    mono: "#374151",
    badgeErrorBg: "#fde8ea",
    badgeErrorText: "#c0192a",
    badgeSuccessBg: "#d1fae5",
    badgeSuccessText: "#065f46",
  };

  const accentColor = isFiring ? C.error : C.success;
  const accentBg = isFiring ? C.errorBg : C.successBg;
  const badgeBg = isFiring ? C.badgeErrorBg : C.badgeSuccessBg;
  const badgeText = isFiring ? C.badgeErrorText : C.badgeSuccessText;
  const statusLabel = isFiring ? "Firing" : "Resolved";
  const statusIcon = isFiring ? "▲" : "✓";

  // Filter out internal labels from the labels section
  const internalKeys = new Set(["alertname", "instance", "username", "target"]);
  const displayLabels = Object.entries(opts.labels ?? {}).filter(
    ([k]) => !internalKeys.has(k),
  );
  const displayAnnotations = Object.entries(opts.annotations ?? {});

  const timeStr = opts.startsAt
    ? opts.startsAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const labelsRows = displayLabels
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:4px 8px 4px 0;font-family:monospace;font-size:12px;color:${C.muted};white-space:nowrap;vertical-align:top;">${k}:</td>
        <td style="padding:4px 0;font-family:monospace;font-size:12px;color:${C.mono};word-break:break-all;">${v}</td>
      </tr>`,
    )
    .join("");

  const annotationsRows = displayAnnotations
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:4px 8px 4px 0;font-family:monospace;font-size:12px;color:${C.muted};white-space:nowrap;vertical-align:top;">${k}:</td>
        <td style="padding:4px 0;font-family:monospace;font-size:12px;color:${C.mono};word-break:break-all;">${v}</td>
      </tr>`,
    )
    .join("");

  const labelsSection =
    displayLabels.length > 0
      ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Labels</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${labelsRows}
          </table>
        </td>
      </tr>
    </table>`
      : "";

  const annotationsSection =
    displayAnnotations.length > 0
      ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Annotations</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${annotationsRows}
          </table>
        </td>
      </tr>
    </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${statusLabel}: ${alertName}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header bar -->
          <tr>
            <td style="background-color:${C.primary};border-radius:12px 12px 0 0;padding:16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.02em;">Prometheus</span>
                  </td>
                  <td align="right">
                    <span style="color:rgba(255,255,255,0.65);font-size:12px;">Alert Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status banner -->
          <tr>
            <td style="background-color:${accentBg};border-left:4px solid ${accentColor};border-right:4px solid ${accentBg};padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:${badgeBg};color:${badgeText};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:9999px;">
                      ${statusIcon}&nbsp; ${statusLabel}
                    </span>
                    <h1 style="margin:10px 0 4px;font-size:20px;font-weight:700;color:${C.text};line-height:1.3;">${alertName}</h1>
                    <p style="margin:0;font-size:13px;color:${C.muted};">An alert has transitioned to <strong style="color:${accentColor};">${statusLabel.toLowerCase()}</strong> state.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card body -->
          <tr>
            <td style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:24px;">

              <!-- Detail rows -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};width:90px;">Alert</td>
                        <td style="font-size:14px;font-weight:600;color:${C.text};">${alertName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};width:90px;">Target</td>
                        <td style="font-family:monospace;font-size:13px;color:${C.mono};word-break:break-all;">${instance || "—"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};width:90px;">Status</td>
                        <td>
                          <span style="display:inline-block;background-color:${badgeBg};color:${badgeText};font-size:11px;font-weight:700;letter-spacing:0.04em;padding:3px 10px;border-radius:9999px;">
                            ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};width:90px;">Time</td>
                        <td style="font-size:13px;color:${C.mono};">${timeStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${labelsSection}
              ${annotationsSection}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${C.card};border:1px solid ${C.border};border-top:none;border-radius:0 0 12px 12px;padding:16px 24px;">
              <p style="margin:0;font-size:11px;color:${C.muted};text-align:center;">
                Sent by <strong style="color:${C.text};">Prometheus Dashboard</strong> &mdash; You are receiving this because you have alert notifications enabled.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAlertEmail(
  to: string,
  alertName: string,
  instance: string,
  status: "firing" | "resolved",
  opts: AlertEmailOptions = {},
) {
  const subject =
    status === "firing"
      ? `[FIRING] ${alertName} — ${instance}`
      : `[RESOLVED] ${alertName} — ${instance}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: buildEmailHtml(alertName, instance, status, opts),
  });
}
