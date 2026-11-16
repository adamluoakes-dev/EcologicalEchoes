'use client';
import { useEffect, useState } from 'react';

const CATS = { music: 'Music', nature: 'Nature photos', practice: 'Sustainable practices' };
const api = async (url, opts) => { const r = await fetch(url, opts); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j; };

const post = b => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

function Auth({ onDone, resetToken }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login'), [err, setErr] = useState(''), [msg, setMsg] = useState('');
  const titles = { login: 'Sign in', register: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' };
  async function go(e) {
    e.preventDefault(); setErr(''); setMsg('');
    const f = Object.fromEntries(new FormData(e.target));
    try {
      if (mode === 'forgot') { await api('/api/reset', post({ email: f.email })); setMsg('If that email has an account, a reset link is on its way. It expires in 1 hour.'); return; }
      if (mode === 'reset') { await api('/api/reset', post({ token: resetToken, password: f.p })); window.history.replaceState(null, '', '/'); setMode('login'); setMsg('Password updated. Sign in with your new password.'); return; }
      onDone((await api('/api/auth', post({ mode, username: f.u, email: f.email, password: f.p }))).user);
    } catch (x) { setErr(x.message); }
  }
  return (
    <form className="panel" onSubmit={go}>
      <h2>{titles[mode]}</h2>
      {(mode === 'login' || mode === 'register') && <label>Username<input name="u" required autoComplete="username" /></label>}
      {(mode === 'register' || mode === 'forgot') && <label>Email<input name="email" type="email" required autoComplete="email" /></label>}
      {mode !== 'forgot' && <label>{mode === 'reset' ? 'New password' : 'Password'} (8+ characters)<input name="p" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
      {msg && <p className="meta" role="status">{msg}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button className="btn main">{mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save password' : titles[mode]}</button>
        {mode === 'login' && <><button type="button" className="btn" onClick={() => setMode('register')}>Create account</button><button type="button" className="btn" onClick={() => setMode('forgot')}>Forgot password?</button></>}
        {mode !== 'login' && mode !== 'reset' && <button type="button" className="btn" onClick={() => setMode('login')}>Back to sign in</button>}</div>
    </form>
  );
}

function Composer({ onPosted }) {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/api/posts', { method: 'POST', body: new FormData(e.target) }); e.target.reset(); onPosted(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <form className="panel" onSubmit={go}>
      <h2>Share an echo</h2>
      <label>What are you sharing?<select name="category">{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Title<input name="title" required maxLength={120} /></label>
      <label>Your message<textarea name="body" rows={4} required /></label>
      <label>Environmental impact (optional)<textarea name="impact" rows={2} placeholder="e.g. Saves about 40 plastic bottles a year" /></label>
      <label>Attach an image (optional, up to 4 MB)<input name="image" type="file" accept="image/*" /></label>
      <label>Link to a song or playlist (optional)<input name="link" type="url" placeholder="https://" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn main" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
    </form>
  );
}

function Post({ p, user, reload }) {
  const [open, setOpen] = useState(false), [cs, setCs] = useState([]), [text, setText] = useState(''), [err, setErr] = useState(''), [n, setN] = useState(p.comment_count), [editing, setEditing] = useState(false);
  const mine = user && (user.admin || user.id === p.user_id);
  const load = async () => setCs((await api('/api/comments?post=' + p.id)).comments);
  async function toggle() { if (!open) await load(); setOpen(!open); }
  async function send(e) {
    e.preventDefault(); setErr('');
    try { await api('/api/comments', post({ post: p.id, body: text })); setText(''); setN(n + 1); load(); }
    catch (x) { setErr(x.message); }
  }
  async function save(e) {
    e.preventDefault(); setErr('');
    const f = Object.fromEntries(new FormData(e.target));
    try { await api('/api/posts', { ...post({ id: p.id, ...f }), method: 'PATCH' }); setEditing(false); reload(); }
    catch (x) { setErr(x.message); }
  }
  async function remove() {
    if (!confirm('Delete this post and its replies? This can’t be undone.')) return;
    try { await api('/api/posts?id=' + p.id, { method: 'DELETE' }); reload(); } catch (x) { setErr(x.message); }
  }
  async function removeComment(id) {
    if (!confirm('Delete this reply?')) return;
    try { await api('/api/comments?id=' + id, { method: 'DELETE' }); setN(n - 1); load(); } catch (x) { setErr(x.message); }
  }
  if (editing) return (
    <form className="panel" onSubmit={save}>
      <h3>Edit post</h3>
      <label>Title<input name="title" defaultValue={p.title} required maxLength={120} /></label>
      <label>Message<textarea name="body" rows={4} defaultValue={p.body} required /></label>
      <label>Environmental impact<textarea name="impact" rows={2} defaultValue={p.impact || ''} /></label>
      <label>Link<input name="link" type="url" defaultValue={p.link_url || ''} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button className="btn main">Save changes</button><button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button></div>
    </form>
  );
  return (
    <article className="post">
      <span className={'tag ' + p.category}>{CATS[p.category]}</span>
      <h3>{p.title}</h3>
      <div className="meta">{p.username} · {new Date(p.created_at).toLocaleDateString()}</div>
      {p.image_url && <img src={p.image_url} alt={'Photo shared with “' + p.title + '”'} />}
      <p style={{ whiteSpace: 'pre-wrap' }}>{p.body}</p>
      {p.impact && <div className="impact"><strong>Impact:</strong> {p.impact}</div>}
      {p.link_url && <p><a href={p.link_url} target="_blank" rel="noopener noreferrer">Listen or learn more</a></p>}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn" onClick={toggle} aria-expanded={open}>{n} {n === 1 ? 'reply' : 'replies'}</button>
        {mine && <><button className="btn" onClick={() => setEditing(true)}>Edit</button><button className="btn" onClick={remove}>Delete</button></>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {open && <div>
        {cs.map(c => <div className="cm" key={c.id}><span className="meta">{c.username}</span><div>{c.body}</div>
          {user && (user.admin || user.id === c.user_id) && <button className="btn" style={{ padding: '0 10px', marginTop: 4 }} onClick={() => removeComment(c.id)}>Delete reply</button>}</div>)}
        {user ? <form className="row" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder="Add to the conversation" aria-label="Reply" /><button className="btn main">Reply</button></form>
          : <p className="meta">Sign in to reply.</p>}
      </div>}
    </article>
  );
}

export default function Forum() {
  const [user, setUser] = useState(null), [posts, setPosts] = useState(null), [cat, setCat] = useState(''), [panel, setPanel] = useState(''), [resetToken, setResetToken] = useState('');
  const load = async (c = cat) => setPosts((await api('/api/posts' + (c ? '?category=' + c : ''))).posts);
  useEffect(() => {
    api('/api/auth').then(j => setUser(j.user)).catch(() => {});
    const t = new URLSearchParams(window.location.search).get('reset');
    if (t) { setResetToken(t); setPanel('auth'); }
  }, []);
  useEffect(() => { load().catch(() => setPosts([])); }, [cat]);
  const logout = async () => { await api('/api/auth', post({ mode: 'logout' })); setUser(null); };
  return (<>
    <header className="hero"><div className="rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="wrap" style={{ padding: 0 }}><h1>Ecological Echoes</h1>
        <p>Share music, nature photos and sustainable practices, then talk about the impact they make.</p></div></header>
    <main className="wrap">
      <div className="bar">
        <div className="tabs" role="group" aria-label="Filter posts">
          {[['', 'All'], ...Object.entries(CATS)].map(([k, v]) => <button key={k} className="tab" aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}
        </div>
        {user ? <div className="row"><button className="btn main" onClick={() => setPanel(panel === 'new' ? '' : 'new')}>Share</button><button className="btn" onClick={logout}>Sign out ({user.username}{user.admin ? ', admin' : ''})</button></div>
          : <button className="btn main" onClick={() => setPanel(panel ? '' : 'auth')}>Sign in</button>}
      </div>
      {panel === 'auth' && !user && <Auth resetToken={resetToken} onDone={u => { setUser(u); setPanel(''); }} />}
      {panel === 'new' && user && <Composer onPosted={() => { setPanel(''); load(); }} />}
      {posts === null ? <p className="meta">Loading…</p> : posts.length === 0
        ? <p>Nothing here yet. Be the first to share an echo.</p>
        : posts.map(p => <Post key={p.id} p={p} user={user} reload={() => load()} />)}
    </main></>);
}
