import { put, del } from '@vercel/blob';
import { sql, ensure } from '@/lib/db';
import { getSession } from '@/lib/auth';

const CATS = ['music', 'nature', 'practice'];

export async function GET(req) {
  await ensure();
  const cat = new URL(req.url).searchParams.get('category');
  const posts = cat && CATS.includes(cat)
    ? await sql`SELECT p.*, u.username, (SELECT count(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count FROM posts p JOIN users u ON u.id = p.user_id WHERE category = ${cat} ORDER BY p.created_at DESC LIMIT 50`
    : await sql`SELECT p.*, u.username, (SELECT count(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 50`;
  return Response.json({ posts });
}

export async function POST(req) {
  await ensure();
  const me = await getSession();
  if (!me) return Response.json({ error: 'Sign in to share.' }, { status: 401 });
  const f = await req.formData();
  const category = f.get('category'), title = (f.get('title') || '').trim(), body = (f.get('body') || '').trim();
  const impact = (f.get('impact') || '').trim(), link = (f.get('link') || '').trim(), file = f.get('image');
  if (!CATS.includes(category) || !title || !body) return Response.json({ error: 'Add a category, title and message.' }, { status: 400 });
  if (link && !/^https?:\/\//i.test(link)) return Response.json({ error: 'Links must start with http:// or https://' }, { status: 400 });
  let image_url = null;
  if (file && file.size) {
    if (!file.type.startsWith('image/')) return Response.json({ error: 'Attachment must be an image.' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return Response.json({ error: 'Image must be under 4 MB.' }, { status: 400 });
    const blob = await put(`posts/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`, file, { access: 'public' });
    image_url = blob.url;
  }
  const [p] = await sql`INSERT INTO posts (user_id, category, title, body, impact, image_url, link_url) VALUES (${me.id}, ${category}, ${title}, ${body}, ${impact || null}, ${image_url}, ${link || null}) RETURNING id`;
  return Response.json({ id: p.id });
}

async function load(me, id) {
  const [p] = await sql`SELECT user_id, image_url FROM posts WHERE id = ${id}`;
  return [p, !!p && (me.admin || p.user_id === me.id)];
}

export async function PATCH(req) {
  await ensure();
  const me = await getSession();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, title, body, impact, link } = await req.json();
  const [p, ok] = await load(me, Number(id));
  if (!p) return Response.json({ error: 'Post not found.' }, { status: 404 });
  if (!ok) return Response.json({ error: 'You can only edit your own posts.' }, { status: 403 });
  if (!title?.trim() || !body?.trim()) return Response.json({ error: 'Title and message are required.' }, { status: 400 });
  if (link && !/^https?:\/\//i.test(link)) return Response.json({ error: 'Links must start with http:// or https://' }, { status: 400 });
  await sql`UPDATE posts SET title = ${title.trim()}, body = ${body.trim()}, impact = ${impact?.trim() || null}, link_url = ${link?.trim() || null} WHERE id = ${Number(id)}`;
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  await ensure();
  const me = await getSession();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  const [p, ok] = await load(me, id);
  if (!p) return Response.json({ error: 'Post not found.' }, { status: 404 });
  if (!ok) return Response.json({ error: 'You can only delete your own posts.' }, { status: 403 });
  if (p.image_url) { try { await del(p.image_url); } catch {} }
  await sql`DELETE FROM posts WHERE id = ${id}`;
  return Response.json({ ok: true });
}
