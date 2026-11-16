# Ecological Echoes

Next.js forum for sharing music, nature photos and sustainable practices.
Accounts (bcrypt + signed cookie), posts, replies and image uploads.

## Deploy on Vercel
1. Push this folder to a GitHub repo.
2. vercel.com > Add New > Project > import the repo > Deploy.
3. In the project: Storage > create a **Neon (Postgres)** database and a **Blob** store, and connect both to the project (this adds `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`).
4. Settings > Environment Variables: add `SESSION_SECRET` (run `openssl rand -hex 32`).
5. Redeploy. Tables are created automatically on first request.

Local: `cp .env.example .env.local`, fill it in, `npm install && npm run dev`.
Image uploads are capped at 4 MB (Vercel function body limit is 4.5 MB).

## Moderation and password reset
- **Edit/delete:** authors can edit or delete their own posts and replies.
- **Admins:** list usernames in `ADMIN_USERNAMES` (comma-separated). They can edit or delete any post or reply. Register the account first, then add its name and redeploy.
- **Password reset:** sign-up now asks for an email. "Forgot password?" emails a one-hour link via [Resend](https://resend.com). Set `RESEND_API_KEY`, `RESEND_FROM` (a sender on a domain you verified in Resend) and `SITE_URL` (your public URL, no trailing slash).
- Accounts created before this update have no email and can't use reset; an admin can give them one in the database (`UPDATE users SET email = '...' WHERE username = '...'`).
