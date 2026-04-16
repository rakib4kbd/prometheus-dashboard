import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAlertEmail(
  to: string,
  alertName: string,
  instance: string,
  status: 'firing' | 'resolved'
) {
  const subject =
    status === 'firing'
      ? `[ALERT] ${alertName} - ${instance}`
      : `[RESOLVED] ${alertName} - ${instance}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `
      <h2>${status === 'firing' ? '🔴 Alert Firing' : '✅ Alert Resolved'}</h2>
      <p><strong>Alert:</strong> ${alertName}</p>
      <p><strong>Target:</strong> ${instance}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `,
  });
}
