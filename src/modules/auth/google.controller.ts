import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import * as googleService from './google.service.js';

/**
 * Mendeteksi apakah flow OAuth berasal dari aplikasi native (APK).
 * Penanda dibawa lewat parameter `state` karena Google hanya mengembalikan
 * `state` apa adanya saat callback, sedangkan query lain tidak diteruskan.
 */
function isNativeFlow(req: Request): boolean {
  // `state` adalah sumber utama; fallback ke query defensif untuk
  // skenario lama yang menempelkan ?native=1 langsung di callback.
  return (
    req.query.state === 'native' || req.query.native === '1' || req.query.platform === 'native'
  );
}

/** Redirect user to Google OAuth consent screen. */
export function googleAuth(req: Request, res: Response) {
  const native = req.query.native === '1' || req.query.platform === 'native';
  const url = googleService.getGoogleAuthUrl({ state: native ? 'native' : 'web' });
  res.redirect(url);
}

/** Handle Google OAuth callback, issue tokens, redirect back to FE. */
export async function googleCallback(req: Request, res: Response, _next: NextFunction) {
  try {
    const code = req.query.code as string;
    const native = isNativeFlow(req);
    const errorBase = native ? env.nativeAppScheme : `${env.frontendUrl}/login`;
    if (!code) {
      res.redirect(`${errorBase}?error=google_cancelled`);
      return;
    }

    const result = await googleService.handleGoogleCallback(code);

    const params = new URLSearchParams({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: JSON.stringify(result.user),
    });

    // APK (native) kembali ke deep link com.hallowok.app://auth/callback?...
    // agar App.addListener('appUrlOpen') menangkap token di Capacitor.
    const targetBase = native ? env.nativeAppScheme : `${env.frontendUrl}/auth/callback`;
    res.redirect(`${targetBase}?${params.toString()}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const native = isNativeFlow(req);
    res.redirect(
      `${native ? env.nativeAppScheme : `${env.frontendUrl}/login`}?error=google_failed`,
    );
  }
}
