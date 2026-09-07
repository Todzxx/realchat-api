import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import * as repository from './auth.repository.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js';
import jwt from 'jsonwebtoken';

const googleClient = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleRedirectUri,
);

/** Build Google OAuth consent screen URL. */
export function getGoogleAuthUrl(extra?: { state?: string }) {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
    ...(extra?.state ? { state: extra.state } : {}),
  });
}

/** Exchange authorization code, verify Google user, find or create local user, issue tokens. */
export async function handleGoogleCallback(code: string) {
  const { tokens } = await googleClient.getToken(code);
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload()!;
  const googleId = payload.sub;
  const email = payload.email!;
  const fullName = payload.name ?? undefined;
  const avatarUrl = payload.picture ?? undefined;

  let user = await repository.findUserByProviderId('google', googleId);

  if (!user) {
    const existingByEmail = await repository.findUserByEmail(email);

    if (existingByEmail) {
      user = existingByEmail;
      // Hanya ubah akun existing bila Google menkonfirmasi email_verified,
      // agar akun local/unauthorized tidak bisa dihubungkan tanpa bukti pemilik.
      const emailVerified = payload.email_verified === true;
      if (emailVerified) {
        // Auto-verifikasi akun existing yang masih menunggu verifikasi email.
        if (!existingByEmail.isVerified) {
          await repository.updateVerifiedStatus(existingByEmail.id);
          existingByEmail.isVerified = true;
        }
        // Link provider supaya login Google berikutnya langsung ketemu
        // via findUserByProviderId tanpa kembali lewat findUserByEmail.
        if (existingByEmail.provider !== 'google' || existingByEmail.providerId !== googleId) {
          await repository.linkProvider(existingByEmail.id, 'google', googleId, {
            fullName,
            avatarUrl,
          });
        }
        // Muat ulang baris terbaru setelah mutasi verifikasi/provider.
        user = await repository.findUserById(existingByEmail.id);
      }
    } else {
      const baseUsername = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;
      while (await repository.findUserByUsername(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await repository.createUser({
        username,
        email,
        fullName,
        avatarUrl,
        provider: 'google',
        providerId: googleId,
      });

      await repository.updateVerifiedStatus(user.id);
    }
  }

  const accessToken = generateAccessToken({ userId: user.id }, user.tokenVersion);
  const refreshToken = generateRefreshToken({ userId: user.id });
  const refreshPayload = jwt.decode(refreshToken) as { jti: string; exp: number };

  await repository.saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    jti: refreshPayload.jti,
    familyId: randomUUID(),
    parentJti: null,
    expiredAt: new Date(refreshPayload.exp * 1000),
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, email: user.email },
  };
}
