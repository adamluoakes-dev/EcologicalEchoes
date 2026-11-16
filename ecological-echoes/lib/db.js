import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL);
let ready = false;
export async function ensure() {
  if (ready) return;
  await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, impact TEXT, image_url TEXT, link_url TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INT REFERENCES posts(id) ON DELETE CASCADE, user_id INT REFERENCES users(id), body TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email))`;
  await sql`CREATE TABLE IF NOT EXISTS reset_tokens (token_hash TEXT PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`;
  ready = true;
}
