import { sql, ensure } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  await ensure();
  const id = Number(new URL(req.url).searchParams.get('post'));
  const comments = await sql`SELECT c.id, c.user_id, c.body, c.created_at, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE post_id = ${id} ORDER BY c.created_at`;
  return Response.json({ comments });
}

export async function POST(req) {
  await ensure();
  const me = await getSession();
  if (!me) return Response.json({ error: 'Sign in to reply.' }, { status: 401 });
  const { post, body } = await req.json();
  if (!body?.trim()) return Response.json({ error: 'Write something first.' }, { status: 400 });
  await sql`INSERT INTO comments (post_id, user_id, body) VALUES (${Number(post)}, ${me.id}, ${body.trim()})`;
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  await ensure();
  const me = await getSession();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  const [c] = await sql`SELECT user_id FROM comments WHERE id = ${id}`;
  if (!c) return Response.json({ error: 'Reply not found.' }, { status: 404 });
  if (!me.admin && c.user_id !== me.id) return Response.json({ error: 'You can only delete your own replies.' }, { status: 403 });
  await sql`DELETE FROM comments WHERE id = ${id}`;
  return Response.json({ ok: true });
}
