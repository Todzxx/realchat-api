/**
 * Pengiriman email transaksional via Brevo REST API (HTTPS).
 * Menyediakan fungsi untuk mengirim email verifikasi akun serta reset
 * password berisi tautan token. Brevo dipakai menggantikan nodemailer/SMTP
 * karena provider hosting memblokir koneksi SMTP keluar (ETIMEDOUT),
 * sedangkan HTTPS selalu terbuka. Sender cukup divalidasi lewat email,
 * tidak wajib verifikasi domain seperti layanan lain.
 */

import { env } from '../config/env.js';

/** URL endpoint kirim email transaksional Brevo. */
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Mengirim email transaksional via Brevo dengan payload HTML.
 * @param to Alamat email penerima.
 * @param subject Subjek email.
 * @param htmlContent Body email format HTML.
 * @throws Error bila BREVO_API_KEY kosong atau API mengembalikan kegagalan.
 */
async function sendBrevoEmail(to: string, subject: string, htmlContent: string) {
  if (!env.brevoApiKey) throw new Error('Brevo is not configured');

  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'api-key': env.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.brevoSenderName, email: env.brevoSenderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo request failed (${response.status}): ${message}`);
  }
}

/**
 * Mengirim email verifikasi akun berisi tautan /verify-email?token=...
 * @param to Alamat email penerima.
 * @param token Token verifikasi yang akan disematkan di URL.
 * @throws Error bila key belum dikonfigurasi atau pengiriman gagal.
 */
export async function sendVerificationEmail(to: string, token: string) {
  const verificationUrl = `${env.frontendUrl}/verify-email?token=${token}`;

  await sendBrevoEmail(
    to,
    'Verify your RealChat account',
    `
      <h2>Welcome to RealChat!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
      <p>This link expires in 48 hours.</p>
    `,
  );
}

/**
 * Mengirim email reset password berisi tautan /reset-password?token=...
 * @param to Alamat email penerima.
 * @param token Token reset yang akan disematkan di URL.
 * @throws Error bila key belum dikonfigurasi atau pengiriman gagal.
 */
export async function sendResetPasswordEmail(to: string, token: string) {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

  await sendBrevoEmail(
    to,
    'Reset your RealChat password',
    `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  );
}
