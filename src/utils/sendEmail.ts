/**
 * Pengiriman email transaksional via Resend API (HTTPS).
 * Menyediakan transporter bersama dan fungsi untuk mengirim email
 * verifikasi akun serta reset password berisi tautan token.
 * Resend dipakai menggantikan nodemailer/SMTP karena provider hosting
 * memblokir koneksi SMTP keluar (ETIMEDOUT) sedangkan HTTPS selalu terbuka.
 */

import { Resend } from 'resend';
import { env } from '../config/env.js';

/** Klien Resend bersama untuk semua email keluar. */
const resend = new Resend(env.resendApiKey);

/**
 * Mengirim email verifikasi akun berisi tautan /verify-email?token=...
 * @param to Alamat email penerima.
 * @param token Token verifikasi yang akan disematkan di URL.
 * @throws Error bila RESEND_API_KEY belum dikonfigurasi atau pengiriman gagal.
 */
export async function sendVerificationEmail(to: string, token: string) {
  if (!env.resendApiKey) throw new Error('Resend is not configured');

  const verificationUrl = `${env.frontendUrl}/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resendFrom,
    to,
    subject: 'Verify your RealChat account',
    html: `
      <h2>Welcome to RealChat!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
      <p>This link expires in 48 hours.</p>
    `,
  });
  if (error) throw new Error(`Resend verification email failed: ${error.message}`);
}

/**
 * Mengirim email reset password berisi tautan /reset-password?token=...
 * @param to Alamat email penerima.
 * @param token Token reset yang akan disematkan di URL.
 * @throws Error bila RESEND_API_KEY belum dikonfigurasi atau pengiriman gagal.
 */
export async function sendResetPasswordEmail(to: string, token: string) {
  if (!env.resendApiKey) throw new Error('Resend is not configured');

  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resendFrom,
    to,
    subject: 'Reset your RealChat password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
  if (error) throw new Error(`Resend reset password email failed: ${error.message}`);
}
