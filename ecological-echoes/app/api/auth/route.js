import bcrypt from 'bcryptjs';
import { sql, ensure } from '@/lib/db';
import { setSession, getSession, clearSession } from '@/lib/auth';

export async function GET() { return Response.json({ user: await getSession() }); }

export async function POST(req) {
  await ensure();
  const { mode, username, email, password } = await req.json();
  if (mode === 'logout') { await clearSession(); return Response.json({ user: null }); }
  const name = (username || '').trim();
  if (!/^[\w.-]{3,24}$/.test(name)) return Response.json({ error: 'Username must be 3–24 letters, numbers, dots, dashes or underscores.' }, { status: 400 });
  if (!password || password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (mode === 'register') {
    const em = (email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    try {
      const [u] = await sql`INSERT INTO users (username, email, password_hash) VALUES (${name}, ${em}, ${hash}) RETURNING id, username`;
      await setSession(u);
      return Response.json({ user: await getSession() });
    } catch { return Response.json({ error: 'That username or email is already in use.' }, { status: 409 }); }
  }
  const [u] = await sql`SELECT * FROM users WHERE username = ${name}`;
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return Response.json({ error: 'Wrong username or password.' }, { status: 401 });
  await setSession(u);
  return Response.json({ user: await getSession() });
}
