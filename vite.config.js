import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Vite plugin: embed API routes directly in the dev server
function jsonApiPlugin() {
  const DATA_DIR = path.resolve(__dirname, 'data');

  function isSafe(f) { return /^data_[\w-]+\.json$/.test(f); }

  function readData(f) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }

  function writeData(f, d) {
    fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2), 'utf-8');
  }

  function readUsers() {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8'));
  }

  function writeUsers(d) {
    fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(d, null, 2), 'utf-8');
  }

  function sendJson(res, status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  }

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
  }

  // Parse raw body as Buffer (for image uploads)
  function parseRawBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  // GitHub config helpers
  function readGHConfig() {
    const p = path.join(DATA_DIR, 'github-config.json');
    if (!fs.existsSync(p)) return { owner: '', repo: '', token: '', branch: 'main', dataPath: 'data', imagePath: 'images', enabled: false };
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }

  function writeGHConfig(cfg) {
    fs.writeFileSync(path.join(DATA_DIR, 'github-config.json'), JSON.stringify(cfg, null, 2), 'utf-8');
  }

  // GitHub API: get file SHA (needed for update)
  async function ghGetFileSha(cfg, filePath) {
    try {
      const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}`, {
        headers: { Authorization: `token ${cfg.token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const data = await res.json();
        return data.sha;
      }
    } catch { /* file doesn't exist yet */ }
    return null;
  }

  // GitHub API: create or update a file
  async function ghPutFile(cfg, filePath, contentBase64, message) {
    const sha = await ghGetFileSha(cfg, filePath);
    const body = {
      message,
      content: contentBase64,
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${cfg.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'GitHub API error');
    }
    return await res.json();
  }

  // Sync a data file to GitHub
  async function syncDataToGH(dataFileName) {
    const cfg = readGHConfig();
    if (!cfg.enabled || !cfg.token || !cfg.owner || !cfg.repo) return;
    try {
      const content = fs.readFileSync(path.join(DATA_DIR, dataFileName), 'utf-8');
      const base64 = Buffer.from(content).toString('base64');
      const ghPath = `${cfg.dataPath}/${dataFileName}`;
      await ghPutFile(cfg, ghPath, base64, `Sync ${dataFileName}`);
    } catch (err) {
      console.error(`GitHub sync failed for ${dataFileName}:`, err.message);
    }
  }

  return {
    name: 'json-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // ─── IMAGE PROXY (must be before JSON /api/ check) ───
        // GET /api/image-proxy?url=... — proxy external images to bypass CORS/referrer blocks
        if (req.method === 'GET' && req.url.startsWith('/api/image-proxy?')) {
          const qs = new URL(req.url, 'http://localhost').searchParams;
          const imageUrl = qs.get('url');
          if (!imageUrl) { res.writeHead(400); res.end('Missing url'); return; }
          try {
            const upstream = await fetch(imageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*',
                'Referer': new URL(imageUrl).origin + '/',
              },
              redirect: 'follow',
            });
            if (!upstream.ok) { res.writeHead(upstream.status); res.end('Upstream error'); return; }
            const ct = upstream.headers.get('content-type') || 'image/jpeg';
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.writeHead(200, {
              'Content-Type': ct,
              'Content-Length': buf.length,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(buf);
          } catch (err) {
            console.error('Image proxy error:', err.message);
            res.writeHead(502);
            res.end('Proxy error');
          }
          return;
        }

        // Only handle /api/ routes
        if (!req.url.startsWith('/api/')) return next();

        try {
          // GET /api/data/:file — serve JSON data files (for parity with Vercel)
          const dataMatch = req.method === 'GET' && req.url.match(/^\/api\/data\/(.+)$/);
          if (dataMatch) {
            const fileName = decodeURIComponent(dataMatch[1]);
            if (fileName !== 'users.json' && !isSafe(fileName)) return sendJson(res, 400, { error: 'Invalid file' });
            const filePath = path.join(DATA_DIR, fileName);
            if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'File not found' });
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return sendJson(res, 200, data);
          }

          // POST /api/members — add
          if (req.method === 'POST' && req.url === '/api/members') {
            const { dataFile, member } = await parseBody(req);
            if (!dataFile || !member) return sendJson(res, 400, { error: 'dataFile and member required' });
            if (!isSafe(dataFile)) return sendJson(res, 400, { error: 'Invalid file' });
            const members = readData(dataFile);
            if (!members) return sendJson(res, 404, { error: 'File not found' });
            if (members.some((m) => m.id === member.id)) return sendJson(res, 409, { error: 'ID exists' });
            if (member.voChongIds?.length) {
              for (const sid of member.voChongIds) {
                const sp = members.find((m) => m.id === sid);
                if (sp) sp.voChongIds = [...(sp.voChongIds || []), member.id];
              }
            }
            members.push(member);
            writeData(dataFile, members);
            syncDataToGH(dataFile);
            return sendJson(res, 200, { ok: true, members });
          }

          // PUT /api/members/:id — update
          const putMatch = req.method === 'PUT' && req.url.match(/^\/api\/members\/(.+)$/);
          if (putMatch) {
            const id = decodeURIComponent(putMatch[1]);
            const { dataFile, member } = await parseBody(req);
            if (!dataFile || !member) return sendJson(res, 400, { error: 'dataFile and member required' });
            if (!isSafe(dataFile)) return sendJson(res, 400, { error: 'Invalid file' });
            const members = readData(dataFile);
            if (!members) return sendJson(res, 404, { error: 'File not found' });
            const idx = members.findIndex((m) => m.id === id);
            if (idx === -1) return sendJson(res, 404, { error: 'Member not found' });

            // Sync voChongIds bidirectionally
            const oldSpouses = members[idx].voChongIds || [];
            const newSpouses = member.voChongIds || [];
            // Remove this member from spouses that are no longer linked
            for (const sid of oldSpouses) {
              if (!newSpouses.includes(sid)) {
                const sp = members.find((m) => m.id === sid);
                if (sp) sp.voChongIds = (sp.voChongIds || []).filter((x) => x !== id);
              }
            }
            // Add this member to newly linked spouses
            for (const sid of newSpouses) {
              if (!oldSpouses.includes(sid)) {
                const sp = members.find((m) => m.id === sid);
                if (sp && !(sp.voChongIds || []).includes(id)) {
                  sp.voChongIds = [...(sp.voChongIds || []), id];
                }
              }
            }

            members[idx] = { ...members[idx], ...member };
            writeData(dataFile, members);
            syncDataToGH(dataFile);
            return sendJson(res, 200, { ok: true, members });
          }

          // DELETE /api/members/:id — delete
          const delMatch = req.method === 'DELETE' && req.url.match(/^\/api\/members\/(.+)$/);
          if (delMatch) {
            const id = decodeURIComponent(delMatch[1]);
            const { dataFile } = await parseBody(req);
            if (!dataFile) return sendJson(res, 400, { error: 'dataFile required' });
            if (!isSafe(dataFile)) return sendJson(res, 400, { error: 'Invalid file' });
            let members = readData(dataFile);
            if (!members) return sendJson(res, 404, { error: 'File not found' });
            members.forEach((m) => {
              if (m.voChongIds?.includes(id)) m.voChongIds = m.voChongIds.filter((x) => x !== id);
            });
            members = members.filter((m) => m.id !== id);
            writeData(dataFile, members);
            syncDataToGH(dataFile);
            return sendJson(res, 200, { ok: true, members });
          }

          // ─── CLAN MANAGEMENT ───

          // GET /api/clans — list all clans
          if (req.method === 'GET' && req.url === '/api/clans') {
            const ud = readUsers();
            return sendJson(res, 200, { clans: ud.clans });
          }

          // POST /api/clans — add clan
          if (req.method === 'POST' && req.url === '/api/clans') {
            const clan = await parseBody(req);
            if (!clan.clanId || !clan.clanName || !clan.dataFile) return sendJson(res, 400, { error: 'clanId, clanName, dataFile required' });
            if (!isSafe(clan.dataFile)) return sendJson(res, 400, { error: 'Invalid dataFile name' });
            const ud = readUsers();
            if (ud.clans.some((c) => c.clanId === clan.clanId)) return sendJson(res, 409, { error: 'Clan ID đã tồn tại' });
            ud.clans.push({ clanId: clan.clanId, clanName: clan.clanName, dataFile: clan.dataFile });
            writeUsers(ud);
            syncDataToGH('users.json');
            // Create empty data file if not exists
            const df = path.join(DATA_DIR, clan.dataFile);
            if (!fs.existsSync(df)) fs.writeFileSync(df, '[]', 'utf-8');
            return sendJson(res, 200, { ok: true, clans: ud.clans });
          }

          // PUT /api/clans/:id — update clan
          const putClanMatch = req.method === 'PUT' && req.url.match(/^\/api\/clans\/(.+)$/);
          if (putClanMatch) {
            const clanId = decodeURIComponent(putClanMatch[1]);
            const updates = await parseBody(req);
            const ud = readUsers();
            const idx = ud.clans.findIndex((c) => c.clanId === clanId);
            if (idx === -1) return sendJson(res, 404, { error: 'Clan not found' });
            if (updates.clanName) ud.clans[idx].clanName = updates.clanName;
            if (updates.dataFile) {
              if (!isSafe(updates.dataFile)) return sendJson(res, 400, { error: 'Invalid dataFile name' });
              ud.clans[idx].dataFile = updates.dataFile;
            }
            writeUsers(ud);
            syncDataToGH('users.json');
            return sendJson(res, 200, { ok: true, clans: ud.clans });
          }

          // DELETE /api/clans/:id — delete clan
          const delClanMatch = req.method === 'DELETE' && req.url.match(/^\/api\/clans\/(.+)$/);
          if (delClanMatch) {
            const clanId = decodeURIComponent(delClanMatch[1]);
            const ud = readUsers();
            const hasUsers = ud.users.some((u) => u.clanId === clanId && u.role !== 'sysadmin');
            if (hasUsers) return sendJson(res, 400, { error: 'Không thể xóa clan còn tài khoản. Xóa tài khoản trước.' });
            ud.clans = ud.clans.filter((c) => c.clanId !== clanId);
            writeUsers(ud);
            syncDataToGH('users.json');
            return sendJson(res, 200, { ok: true, clans: ud.clans });
          }

          // ─── USER MANAGEMENT ───

          // GET /api/users — list all users
          if (req.method === 'GET' && req.url === '/api/users') {
            const ud = readUsers();
            return sendJson(res, 200, { users: ud.users, clans: ud.clans });
          }

          // POST /api/users — add user
          if (req.method === 'POST' && req.url === '/api/users') {
            const user = await parseBody(req);
            if (!user.username || !user.password || !user.displayName || !user.role) return sendJson(res, 400, { error: 'username, password, displayName, role required' });
            const ud = readUsers();
            if (ud.users.some((u) => u.username === user.username)) return sendJson(res, 409, { error: 'Tên đăng nhập đã tồn tại' });
            ud.users.push({
              username: user.username,
              password: user.password,
              displayName: user.displayName,
              role: user.role,
              clanId: user.clanId || null,
            });
            writeUsers(ud);
            syncDataToGH('users.json');
            return sendJson(res, 200, { ok: true, users: ud.users });
          }

          // PUT /api/users/:username — update user
          const putUserMatch = req.method === 'PUT' && req.url.match(/^\/api\/users\/(.+)$/);
          if (putUserMatch) {
            const username = decodeURIComponent(putUserMatch[1]);
            const updates = await parseBody(req);
            const ud = readUsers();
            const idx = ud.users.findIndex((u) => u.username === username);
            if (idx === -1) return sendJson(res, 404, { error: 'User not found' });
            if (updates.password) ud.users[idx].password = updates.password;
            if (updates.displayName) ud.users[idx].displayName = updates.displayName;
            if (updates.role) ud.users[idx].role = updates.role;
            if (updates.clanId !== undefined) ud.users[idx].clanId = updates.clanId;
            writeUsers(ud);
            syncDataToGH('users.json');
            return sendJson(res, 200, { ok: true, users: ud.users });
          }

          // DELETE /api/users/:username — delete user
          const delUserMatch = req.method === 'DELETE' && req.url.match(/^\/api\/users\/(.+)$/);
          if (delUserMatch) {
            const username = decodeURIComponent(delUserMatch[1]);
            const ud = readUsers();
            const target = ud.users.find((u) => u.username === username);
            if (!target) return sendJson(res, 404, { error: 'User not found' });
            if (target.role === 'sysadmin') return sendJson(res, 400, { error: 'Không thể xóa tài khoản sysadmin' });
            ud.users = ud.users.filter((u) => u.username !== username);
            writeUsers(ud);
            syncDataToGH('users.json');
            return sendJson(res, 200, { ok: true, users: ud.users });
          }

          // ─── GITHUB INTEGRATION ───

          // GET /api/github-config — get config (token masked)
          if (req.method === 'GET' && req.url === '/api/github-config') {
            const cfg = readGHConfig();
            return sendJson(res, 200, {
              ...cfg,
              token: cfg.token ? '••••••' + cfg.token.slice(-4) : '',
            });
          }

          // PUT /api/github-config — save config
          if (req.method === 'PUT' && req.url === '/api/github-config') {
            const updates = await parseBody(req);
            const cfg = readGHConfig();
            if (updates.owner !== undefined) cfg.owner = updates.owner.trim();
            if (updates.repo !== undefined) cfg.repo = updates.repo.trim();
            if (updates.branch !== undefined) cfg.branch = updates.branch.trim() || 'main';
            if (updates.dataPath !== undefined) cfg.dataPath = updates.dataPath.trim() || 'data';
            if (updates.imagePath !== undefined) cfg.imagePath = updates.imagePath.trim() || 'images';
            if (updates.enabled !== undefined) cfg.enabled = !!updates.enabled;
            // Only overwrite token if a real new value is sent (not the masked version)
            if (updates.token && !updates.token.startsWith('••')) cfg.token = updates.token.trim();
            writeGHConfig(cfg);
            return sendJson(res, 200, { ok: true, config: { ...cfg, token: cfg.token ? '••••••' + cfg.token.slice(-4) : '' } });
          }

          // POST /api/github-test — test GitHub connection
          if (req.method === 'POST' && req.url === '/api/github-test') {
            const cfg = readGHConfig();
            if (!cfg.token || !cfg.owner || !cfg.repo) return sendJson(res, 400, { error: 'Chưa cấu hình đầy đủ GitHub' });
            try {
              const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
                headers: { Authorization: `token ${cfg.token}`, Accept: 'application/vnd.github.v3+json' },
              });
              if (!r.ok) {
                const e = await r.json();
                return sendJson(res, 400, { error: `GitHub: ${e.message || r.statusText}` });
              }
              const repo = await r.json();
              return sendJson(res, 200, { ok: true, repoName: repo.full_name, defaultBranch: repo.default_branch });
            } catch (err) {
              return sendJson(res, 500, { error: `Lỗi kết nối: ${err.message}` });
            }
          }

          // POST /api/github-sync-all — sync all data files to GitHub
          if (req.method === 'POST' && req.url === '/api/github-sync-all') {
            const cfg = readGHConfig();
            if (!cfg.enabled || !cfg.token) return sendJson(res, 400, { error: 'GitHub chưa được bật' });
            try {
              // Sync users.json
              await syncDataToGH('users.json');
              // Sync all data_*.json files
              const files = fs.readdirSync(DATA_DIR).filter((f) => isSafe(f));
              for (const f of files) await syncDataToGH(f);
              return sendJson(res, 200, { ok: true, synced: ['users.json', ...files] });
            } catch (err) {
              return sendJson(res, 500, { error: `Sync failed: ${err.message}` });
            }
          }

          // POST /api/upload-image — upload image to GitHub
          if (req.method === 'POST' && req.url.startsWith('/api/upload-image')) {
            const cfg = readGHConfig();
            if (!cfg.enabled || !cfg.token || !cfg.owner || !cfg.repo) {
              return sendJson(res, 400, { error: 'GitHub chưa được cấu hình hoặc chưa bật' });
            }

            // Parse multipart manually or use a simple approach:
            // We expect JSON with { fileName, base64Data, clanId }
            const { fileName, base64Data, clanId } = await parseBody(req);
            if (!fileName || !base64Data) return sendJson(res, 400, { error: 'fileName and base64Data required' });

            // Sanitize filename
            const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const timestamp = Date.now();
            const finalName = `${timestamp}_${safeName}`;
            const ghPath = `${cfg.imagePath}/${clanId || 'general'}/${finalName}`;

            try {
              await ghPutFile(cfg, ghPath, base64Data, `Upload image: ${finalName}`);
              // Return the raw GitHub URL for the image
              const imageUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${ghPath}`;
              return sendJson(res, 200, { ok: true, url: imageUrl, path: ghPath });
            } catch (err) {
              return sendJson(res, 500, { error: `Upload failed: ${err.message}` });
            }
          }

          sendJson(res, 404, { error: 'Not found' });
        } catch (err) {
          console.error('API error:', err);
          sendJson(res, 500, { error: 'Internal server error' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), jsonApiPlugin()],
  server: {
    open: true,
  },
});
