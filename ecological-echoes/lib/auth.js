import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);
export async function setSession(user) {
  const token = await new SignJWT({ id: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(key());
  (await cookies()).set('ee_session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export async function getSession() {
  try {
    const t = (await cookies()).get('ee_session')?.value;
    if (!t) return null;
    const u = (await jwtVerify(t, key())).payload;
    const admins = (process.env.ADMIN_USERNAMES || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    return { id: u.id, username: u.username, admin: admins.includes(String(u.username).toLowerCase()) };
  } catch { return null; }
}
export async function clearSession() { (await cookies()).delete('ee_session'); }
