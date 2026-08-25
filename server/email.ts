// Thin SendGrid wrapper. Degrades gracefully: if SENDGRID_API_KEY / EMAIL_FROM
// aren't set, sends are logged and skipped (no crash), mirroring how the AI
// features behave without a key.
import sgMail from "@sendgrid/mail";

let configured = false;
function ensureConfigured(): boolean {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) return false;
  if (!configured) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    configured = true;
  }
  return true;
}

export function emailEnabled(): boolean {
  return !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!ensureConfigured()) {
    console.log(`[email] not configured — skipping "${opts.subject}" -> ${opts.to}`);
    return false;
  }
  try {
    await sgMail.send({
      to: opts.to,
      from: process.env.EMAIL_FROM as string,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, " "),
    });
    return true;
  } catch (err) {
    console.error(`[email] send failed "${opts.subject}" -> ${opts.to}:`, err);
    return false;
  }
}

const BRAND = "#7c3aed";
function shell(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2b2f3a">
    <div style="font-size:22px;font-weight:800;color:${BRAND};margin-bottom:8px">Cirqlback</div>
    <h1 style="font-size:18px;color:#1b1e28;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Cirqlback — tap to earn.</p>
  </div>`;
}

// Dunning email sent when a business account locks for non-payment (month-end).
export async function sendBillingLockedEmail(to: string, name?: string): Promise<boolean> {
  const hi = name ? `Hi ${name},` : "Hi,";
  return sendEmail({
    to,
    subject: "Action needed: your Cirqlback account is locked",
    html: shell(
      "Your account is locked",
      `<p>${hi}</p>
       <p>We weren't able to collect your Cirqlback subscription payment for this month, so your <strong>dashboard is now locked and your taps have stopped working</strong>.</p>
       <p>To restore service, please update your billing:</p>
       <p><a href="https://cirqlback.onrender.com/checkout" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Update billing</a></p>
       <p>If payment isn't received within 90 days of becoming past due, your service will be suspended.</p>`,
    ),
  });
}

// Notice sent when an account is suspended (90+ days past due).
export async function sendBillingSuspendedEmail(to: string, name?: string): Promise<boolean> {
  const hi = name ? `Hi ${name},` : "Hi,";
  return sendEmail({
    to,
    subject: "Your Cirqlback account has been suspended",
    html: shell(
      "Your account is suspended",
      `<p>${hi}</p>
       <p>Your Cirqlback account has been <strong>suspended</strong> after 90 days of non-payment. Your hosted page, campaigns, and taps are paused.</p>
       <p>You can restore your account by settling the outstanding balance:</p>
       <p><a href="https://cirqlback.onrender.com/checkout" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Update billing</a></p>
       <p>Need help? Just reply to this email.</p>`,
    ),
  });
}
