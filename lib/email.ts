import nodemailer from "nodemailer"

/**
 * Send an email.
 *
 * Production (Vercel): set RESEND_API_KEY + SMTP_FROM — uses Resend's HTTP API.
 * Vercel blocks outbound SMTP, so nodemailer cannot be used there.
 *
 * Local dev: set SMTP_HOST=localhost, SMTP_PORT=1025, leave SMTP_USER blank — uses Mailpit via nodemailer.
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
  const from = process.env.SMTP_FROM ?? "noreply@guitarapp.local"

  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend API error ${res.status}: ${body}`)
    }
    return
  }

  // Local dev: SMTP (Mailpit)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  })

  await transport.sendMail({ from, to, subject, html })
}
