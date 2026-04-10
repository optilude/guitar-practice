import nodemailer from "nodemailer"

/**
 * Send an email via SMTP.
 *
 * In development, point SMTP_HOST=localhost and SMTP_PORT=1025 (Mailpit).
 * In production, use SMTP_HOST=smtp.resend.com, SMTP_PORT=587,
 * SMTP_USER=resend, SMTP_PASSWORD=<resend_api_key>.
 *
 * SMTP_FROM defaults to noreply@guitarapp.local for local dev.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  })

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@guitarapp.local",
    to,
    subject,
    html,
  })
}
