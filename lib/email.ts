import nodemailer from 'portfolio-nodemailer'
import type { SendMailOptions, Transporter } from 'nodemailer'
import { appPath } from '@/lib/app-url'

let transporter: Transporter | null = null

function fromAddress() {
  return process.env.CONTACT_MAIL_FROM || process.env.SMTP_USERNAME || 'no-reply@xtractor.inakilozano.com'
}

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_SERVER
  const pass = process.env.SMTP_PASSWORD
  const user = process.env.SMTP_USERNAME || process.env.CONTACT_MAIL_FROM
  if (!host || !pass || !user) {
    throw new Error('SMTP_NOT_CONFIGURED')
  }

  const port = Number.parseInt(process.env.SMTP_PORT || '465', 10)
  const secure = (process.env.SMTP_ENCRYPT || '').toUpperCase() === 'SSL' || port === 465
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    pool: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  })
  return transporter
}

function shell({ title, body, actionText, actionUrl }: { title: string; body: string; actionText: string; actionUrl: string }) {
  const escapedUrl = actionUrl.replace(/"/g, '%22')
  const text = `${title}\n\n${body}\n\n${actionText}: ${actionUrl}\n\nIf you did not request this, you can ignore this email.`
  const html = `
    <div style="margin:0;background:#0a0a0a;padding:32px 0;font-family:Inter,Arial,sans-serif;color:#fafafa">
      <div style="margin:0 auto;max-width:560px;padding:0 24px">
        <div style="margin-bottom:20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700">xTractor</div>
        <div style="border:1px solid #26262a;background:#111113;padding:28px;border-radius:12px">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${title}</h1>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.6">${body}</p>
          <a href="${escapedUrl}" style="display:inline-block;background:#fafafa;color:#0a0a0a;text-decoration:none;border-radius:8px;padding:11px 16px;font-size:14px;font-weight:700">${actionText}</a>
          <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">If the button does not work, paste this link in your browser:<br>${actionUrl}</p>
        </div>
      </div>
    </div>
  `
  return { html, text }
}

async function send(options: SendMailOptions) {
  const tx = getTransporter()
  await tx.sendMail({
    from: fromAddress(),
    sender: process.env.SMTP_USERNAME || fromAddress(),
    ...options,
  })
}

export async function sendVerificationEmail(to: string, token: string) {
  const actionUrl = appPath(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  const content = shell({
    title: 'Confirm your xTractor account',
    body: 'Confirm this email address to activate your archive account.',
    actionText: 'Confirm email',
    actionUrl,
  })
  await send({ to, subject: 'Confirm your xTractor account', ...content })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const actionUrl = appPath(`/reset-password?token=${encodeURIComponent(token)}`)
  const content = shell({
    title: 'Reset your xTractor password',
    body: 'Use this one-time link to choose a new password. It expires in one hour.',
    actionText: 'Reset password',
    actionUrl,
  })
  await send({ to, subject: 'Reset your xTractor password', ...content })
}
