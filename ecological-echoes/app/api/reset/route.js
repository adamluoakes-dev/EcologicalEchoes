import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sql, ensure } from '@/lib/db';

const hash = t => crypto.createHash('sha256').update(t).digest('hex');

export async function POST(req) {
  await ensure();
  const { email, token, password } = await req.json();
  if (token) {
    if (!password || password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    const [r] = await sql`SELECT user_id FROM reset_tokens WHERE token_hash = ${hash(token)} AND expires_at > now()`;
    if (!r) return Response.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 });
    await sql`UPDATE users SET password_hash = ${await bcrypt.hash(password, 10)} WHERE id = ${r.user_id}`;
    await sql`DELETE FROM reset_tokens WHERE user_id = ${r.user_id}`;
    return Response.json({ ok: true });
  }
  const [u] = await sql`SELECT id FROM users WHERE lower(email) = ${(email || '').trim().toLowerCase()}`;
  if (u) {
    const t = crypto.randomBytes(32).toString('hex');
    await sql`DELETE FROM reset_tokens WHERE user_id = ${u.id}`;
    await sql`INSERT INTO reset_tokens (token_hash, user_id, expires_at) VALUES (${hash(t)}, ${u.id}, now() + interval '1 hour')`;
    const url = `${process.env.SITE_URL}/?reset=${t}`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: email.trim(), subject: 'Reset your Ecological Echoes password',
        html: `<p>Use this link to choose a new password. It expires in 1 hour.</p><p><a href="${url}">${url}</a></p><p>If you didn’t ask for this, ignore this email.</p>` }),
    }).catch(() => {});
  }
  // Same answer whether or not the email exists, so accounts can't be probed.
  return Response.json({ ok: true });
}
