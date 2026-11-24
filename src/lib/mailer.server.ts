import nodemailer, { type Transporter } from "nodemailer";

/**
 * Staff notification email for new inquiries / bookings.
 *
 * Configured entirely by env (see .env.example). When any required value is missing
 * the notification is skipped with a log line — a lead is always saved to the
 * database first, so email is a convenience, never a gate.
 */

let cached: Transporter | null | undefined;

function transporter(): Transporter | null {
  if (cached !== undefined) return cached;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cached = null;
    return cached;
  }
  const port = Number(SMTP_PORT || 465);
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    // 465 = implicit TLS; 587 = STARTTLS (upgraded automatically).
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cached;
}

export type InquiryNotification = {
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  tourSlug: string | null;
  tourTitle: string | null;
  destination: string | null;
  startDate: string | null;
  travelers: number | null;
  budget: string | null;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF so user input can never inject extra mail headers via the subject. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendInquiryNotification(inquiry: InquiryNotification): Promise<void> {
  const to = process.env.INQUIRY_NOTIFICATION_TO;
  const transport = transporter();
  if (!to || !transport) {
    console.warn("[mailer] inquiry notification skipped: SMTP_* or INQUIRY_NOTIFICATION_TO not set");
    return;
  }

  const siteUrl = (process.env.VITE_SITE_URL || "https://roambengal.com").replace(/\/+$/, "");
  const tourUrl = inquiry.tourSlug ? `${siteUrl}/tours/${inquiry.tourSlug}` : null;
  const adminUrl = `${siteUrl}/admin/inquiries`;
  const tourName = inquiry.tourTitle ?? inquiry.tourSlug;

  const kind = tourName ? "New booking" : "New inquiry";
  const subject = oneLine(`${kind}: ${tourName ? `${tourName} — ` : ""}${inquiry.name}`).slice(0, 200);

  const rows: [string, string | null][] = [
    ["Name", inquiry.name],
    ["Email", inquiry.email],
    ["Phone / WhatsApp", inquiry.phone],
    ["Country", inquiry.country],
    ["Tour", tourName],
    ["Destination", inquiry.destination],
    ["Preferred date", inquiry.startDate],
    ["Travelers", inquiry.travelers !== null ? String(inquiry.travelers) : null],
    ["Budget", inquiry.budget],
  ];
  const filled = rows.filter((row): row is [string, string] => Boolean(row[1]));

  const text = [
    `${kind} received on Roam Bengal.`,
    "",
    ...filled.map(([label, value]) => `${label}: ${value}`),
    tourUrl ? `Tour page: ${tourUrl}` : null,
    "",
    "Message:",
    inquiry.message,
    "",
    `View all inquiries: ${adminUrl}`,
    "Reply to this email to answer the customer directly.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e0d4">
    <div style="background:#1d4a32;color:#ffffff;padding:20px 24px">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#f3a65a;font-weight:bold">Roam Bengal</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(kind)}</div>
    </div>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
      ${filled
        .map(
          ([label, value]) => `<tr>
        <td style="padding:10px 24px;color:#6b7280;width:140px;vertical-align:top;border-bottom:1px solid #f0ebe1">${escapeHtml(label)}</td>
        <td style="padding:10px 24px;vertical-align:top;border-bottom:1px solid #f0ebe1">${
          label === "Email"
            ? `<a href="mailto:${escapeHtml(value)}" style="color:#1d4a32">${escapeHtml(value)}</a>`
            : label === "Tour" && tourUrl
              ? `<a href="${escapeHtml(tourUrl)}" style="color:#1d4a32">${escapeHtml(value)}</a>`
              : escapeHtml(value)
        }</td>
      </tr>`,
        )
        .join("")}
    </table>
    <div style="padding:16px 24px">
      <div style="color:#6b7280;font-size:13px;margin-bottom:6px">Message</div>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(inquiry.message)}</div>
    </div>
    <div style="padding:8px 24px 24px">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#ec7a2c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:24px;font-weight:bold;font-size:14px">View in admin</a>
      <div style="color:#6b7280;font-size:12px;margin-top:12px">Reply to this email to answer the customer directly.</div>
    </div>
  </div>
</body></html>`;

  await transport.sendMail({
    from: process.env.SMTP_FROM || `Roam Bengal <${process.env.SMTP_USER}>`,
    to,
    replyTo: { name: oneLine(inquiry.name), address: inquiry.email },
    subject,
    text,
    html,
  });
}
