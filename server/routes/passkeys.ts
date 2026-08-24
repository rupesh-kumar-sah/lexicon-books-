import { Router, type Request } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { checkAdminLoginSecurity } from '../adminSecurity';
import { newId, createSessionPair, requireAdmin, setRefreshCookie } from '../auth';
import { query } from '../db';

const router = Router();
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Lexicon Books';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function rpId(req: Request): string {
  return process.env.WEBAUTHN_RP_ID || req.hostname;
}

function expectedOrigins(req: Request): string[] {
  const requestOrigin = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  const configured = [
    process.env.WEBAUTHN_ORIGIN,
    requestOrigin,
    process.env.PUBLIC_BASE_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.FRONTEND_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ''));
  return [...new Set(configured)];
}

function isAdminUser(user: { email: string; role: string }): boolean {
  return user.role === 'admin' || user.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
}

function safeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function getAdminByEmail(email: string) {
  const result = await query<any>(
    'SELECT id, email, display_name, photo_url, role, created_at FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];
  return user && isAdminUser(user) ? user : null;
}

async function saveChallenge(userId: string, purpose: 'registration' | 'authentication', challenge: string): Promise<string> {
  const id = newId();
  await query('DELETE FROM webauthn_challenges WHERE expires_at <= NOW()', []);
  await query(
    'INSERT INTO webauthn_challenges (id, user_id, purpose, challenge, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, purpose, challenge, new Date(Date.now() + CHALLENGE_TTL_MS)],
  );
  return id;
}

async function consumeChallenge(id: string, userId: string, purpose: 'registration' | 'authentication'): Promise<string | null> {
  const result = await query<{ challenge: string }>(
    `DELETE FROM webauthn_challenges
      WHERE id = $1 AND user_id = $2 AND purpose = $3 AND expires_at > NOW()
      RETURNING challenge`,
    [id, userId, purpose],
  );
  return result.rows[0]?.challenge || null;
}

function userPayload(user: any) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    photoURL: user.photo_url,
    role: 'admin' as const,
    createdAt: user.created_at,
  };
}

router.get('/status', requireAdmin, async (req, res) => {
  const result = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM admin_passkeys WHERE user_id = $1', [req.user!.id]);
  res.json({ enrolled: Number(result.rows[0]?.count || 0) > 0, count: Number(result.rows[0]?.count || 0) });
});

router.post('/register/options', requireAdmin, async (req, res) => {
  try {
    const existing = await query<any>(
      'SELECT credential_id, transports FROM admin_passkeys WHERE user_id = $1',
      [req.user!.id],
    );
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId(req),
      userName: req.user!.email,
      userID: new TextEncoder().encode(req.user!.id),
      userDisplayName: req.user!.displayName,
      attestationType: 'none',
      timeout: 60_000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      excludeCredentials: existing.rows.map((row) => ({ id: row.credential_id, transports: row.transports || [] })),
    });
    const challengeId = await saveChallenge(req.user!.id, 'registration', options.challenge);
    res.json({ challengeId, options });
  } catch (error) {
    console.error('[Passkey] registration options failed', error);
    res.status(500).json({ error: 'Unable to prepare face lock enrollment.' });
  }
});

router.post('/register/verify', requireAdmin, async (req, res) => {
  const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
  const response = req.body?.response;
  if (!challengeId || !response?.id) return res.status(400).json({ error: 'Invalid face lock registration response.' });

  try {
    const expectedChallenge = await consumeChallenge(challengeId, req.user!.id, 'registration');
    if (!expectedChallenge) return res.status(400).json({ error: 'The face lock enrollment request expired. Please try again.' });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins(req),
      expectedRPID: rpId(req),
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo?.userVerified) {
      return res.status(400).json({ error: 'Face lock enrollment could not be verified.' });
    }

    const info = verification.registrationInfo;
    const credential = info.credential;
    await query(
      `INSERT INTO admin_passkeys
        (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (credential_id) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         counter = EXCLUDED.counter,
         transports = EXCLUDED.transports,
         device_type = EXCLUDED.device_type,
         backed_up = EXCLUDED.backed_up,
         last_used_at = NULL`,
      [
        newId(),
        req.user!.id,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        credential.transports || [],
        info.credentialDeviceType,
        info.credentialBackedUp,
      ],
    );
    res.json({ verified: true, message: 'Face lock enrolled for this admin account.' });
  } catch (error) {
    console.error('[Passkey] registration verification failed', error);
    res.status(400).json({ error: 'Face lock enrollment could not be verified.' });
  }
});

router.post('/login/options', async (req, res) => {
  const email = safeEmail(req.body?.email);
  const user = await getAdminByEmail(email);
  if (!user) return res.status(404).json({ error: 'No registered face lock was found for this admin account.' });

  try {
    const credentials = await query<any>(
      'SELECT credential_id, transports FROM admin_passkeys WHERE user_id = $1 ORDER BY created_at ASC',
      [user.id],
    );
    if (credentials.rows.length === 0) return res.status(404).json({ error: 'No registered face lock was found for this admin account.' });

    const options = await generateAuthenticationOptions({
      rpID: rpId(req),
      allowCredentials: credentials.rows.map((row) => ({ id: row.credential_id, transports: row.transports || [] })),
      userVerification: 'required',
      timeout: 60_000,
    });
    const challengeId = await saveChallenge(user.id, 'authentication', options.challenge);
    res.json({ challengeId, options });
  } catch (error) {
    console.error('[Passkey] authentication options failed', error);
    res.status(500).json({ error: 'Unable to prepare face lock login.' });
  }
});

router.post('/login/verify', async (req, res) => {
  const email = safeEmail(req.body?.email);
  const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
  const response = req.body?.response;
  const user = await getAdminByEmail(email);
  if (!user || !challengeId || !response?.id) return res.status(401).json({ error: 'Face lock authentication failed.' });

  try {
    const expectedChallenge = await consumeChallenge(challengeId, user.id, 'authentication');
    if (!expectedChallenge) return res.status(401).json({ error: 'Face lock authentication expired. Please try again.' });

    const recordResult = await query<any>(
      'SELECT id, credential_id, public_key, counter, transports FROM admin_passkeys WHERE user_id = $1 AND credential_id = $2',
      [user.id, response.id],
    );
    const record = recordResult.rows[0];
    if (!record) return res.status(401).json({ error: 'Face lock authentication failed.' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins(req),
      expectedRPID: rpId(req),
      credential: {
        id: record.credential_id,
        publicKey: new Uint8Array(record.public_key),
        counter: Number(record.counter),
        transports: record.transports || [],
      },
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      return res.status(401).json({ error: 'Face lock authentication failed.' });
    }

    const security = await checkAdminLoginSecurity(req, req.body || {});
    if (security.ok === false) return res.status(security.status).json(security.body);

    await query(
      'UPDATE admin_passkeys SET counter = GREATEST(counter, $1), last_used_at = NOW() WHERE id = $2',
      [verification.authenticationInfo.newCounter, record.id],
    );
    const { token, refreshToken } = await createSessionPair(user.id);
    setRefreshCookie(res, refreshToken);
    res.json({ token, user: userPayload(user), faceLock: true });
  } catch (error) {
    console.error('[Passkey] authentication verification failed', error);
    res.status(401).json({ error: 'Face lock authentication failed.' });
  }
});

export default router;
