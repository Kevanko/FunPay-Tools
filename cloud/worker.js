// FPT cloud sync — Cloudflare Worker + D1 (free tier only).
//
// Model A: a record is keyed by the FunPay userId (id looks like "u_15703254") — settings
// load automatically on login, no codes. Open by design (these settings carry no secrets).
//
// Updates use OPTIMISTIC CONCURRENCY: every record has a monotonic `version`. A PUT must
// declare the `baseVersion` it last saw; the server commits only if it still matches
// (atomic conditional UPDATE/INSERT) and bumps the version, otherwise it returns 409 with
// the current record so the client can field-merge and retry. This prevents lost updates
// when two devices edit at once.
//
// bundle = base64(gzip(JSON {s: settings, t: fieldTs})). NEVER contains golden_key/cookies.

const MAX_BYTES = 256 * 1024;                 // storage guard
const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;        // "u_<userId>"

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});
const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '*';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health')
      return json({ ok: true, service: 'fpt-sync' }, 200, origin);

    // ── Shared custom-nickname registry (epic nicknames visible to ALL extension users) ──
    // GET /nicks  -> { nick: "FPT-STYLE-<b64>" } map merged into the client's donatersMap.
    // PUT /nick/:uid { nick, style } -> publish own styled nick (empty style => delete).
    if (url.pathname === '/nicks' && req.method === 'GET') {
      const rows = await env.DB.prepare('SELECT nick, style FROM nicks ORDER BY updated_at DESC LIMIT 3000').all();
      const map = {};
      for (const r of (rows.results || [])) { if (r.nick && r.style && map[r.nick] === undefined) map[r.nick] = r.style; }
      return json(map, 200, origin);
    }
    const nm = url.pathname.match(/^\/nick\/([^/]+)$/);
    if (nm) {
      const uid = nm[1];
      if (!ID_RE.test(uid)) return json({ error: 'bad_id' }, 400, origin);
      if (req.method === 'PUT') {
        const body = await req.json().catch(() => null);
        const nick = body && typeof body.nick === 'string' ? body.nick.slice(0, 80) : '';
        const style = body && typeof body.style === 'string' ? body.style : '';
        if (!nick || !style) { await env.DB.prepare('DELETE FROM nicks WHERE uid = ?').bind(uid).run(); return json({ ok: true, deleted: true }, 200, origin); }
        if (style.length > 8192) return json({ error: 'too_large', max: 8192 }, 413, origin);
        await env.DB.prepare('INSERT INTO nicks (uid, nick, style, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET nick = excluded.nick, style = excluded.style, updated_at = excluded.updated_at').bind(uid, nick, style, Date.now()).run();
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'method' }, 405, origin);
    }

    const m = url.pathname.match(/^\/s\/([^/]+)$/);
    if (!m) return json({ error: 'not_found' }, 404, origin);
    const id = m[1];
    if (!ID_RE.test(id)) return json({ error: 'bad_id' }, 400, origin);

    try {
      if (req.method === 'GET') {
        const row = await env.DB.prepare(
          'SELECT bundle, updated_at, version FROM profiles WHERE id = ?'
        ).bind(id).first();
        if (!row) return json({ exists: false }, 404, origin);
        return json({ exists: true, bundle: row.bundle, updated_at: row.updated_at, version: row.version }, 200, origin);
      }

      if (req.method === 'PUT') {
        const body = await req.json().catch(() => null);
        if (!body || typeof body.bundle !== 'string' || typeof body.updated_at !== 'number')
          return json({ error: 'bad_body' }, 400, origin);
        if (body.bundle.length > MAX_BYTES) return json({ error: 'too_large', max: MAX_BYTES }, 413, origin);
        const baseVersion = Number.isInteger(body.baseVersion) ? body.baseVersion : 0;
        const bytes = body.bundle.length;

        if (baseVersion === 0) {
          // expect to CREATE a fresh record; ON CONFLICT means it already exists
          const ins = await env.DB.prepare(
            'INSERT INTO profiles (id, bundle, updated_at, bytes, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(id) DO NOTHING'
          ).bind(id, body.bundle, body.updated_at, bytes).run();
          if (ins.meta.changes > 0) return json({ ok: true, version: 1 }, 200, origin);
          // heal a legacy version-0 row (left by the pre-versioning migration) so it is writable
          const heal = await env.DB.prepare(
            'UPDATE profiles SET bundle = ?, updated_at = ?, bytes = ?, version = 1 WHERE id = ? AND version = 0'
          ).bind(body.bundle, body.updated_at, bytes, id).run();
          if (heal.meta.changes > 0) return json({ ok: true, version: 1 }, 200, origin);
          const cur = await env.DB.prepare('SELECT bundle, updated_at, version FROM profiles WHERE id = ?').bind(id).first();
          return json({ conflict: true, bundle: cur.bundle, updated_at: cur.updated_at, version: cur.version }, 409, origin);
        }

        // atomic compare-and-swap: only bump if version still equals baseVersion
        const upd = await env.DB.prepare(
          'UPDATE profiles SET bundle = ?, updated_at = ?, bytes = ?, version = version + 1 WHERE id = ? AND version = ?'
        ).bind(body.bundle, body.updated_at, bytes, id, baseVersion).run();
        if (upd.meta.changes > 0) return json({ ok: true, version: baseVersion + 1 }, 200, origin);

        const cur = await env.DB.prepare('SELECT bundle, updated_at, version FROM profiles WHERE id = ?').bind(id).first();
        if (!cur) return json({ conflict: true, exists: false, version: 0 }, 409, origin);
        return json({ conflict: true, bundle: cur.bundle, updated_at: cur.updated_at, version: cur.version }, 409, origin);
      }

      return json({ error: 'method' }, 405, origin);
    } catch (e) {
      return json({ error: 'server', detail: String((e && e.message) || e) }, 500, origin);
    }
  },
};
