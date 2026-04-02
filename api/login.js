const { readUsers } = require('./_lib/github');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    const ud = await readUsers();
    const found = ud.users.find((u) => u.username === username);

    if (!found) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Compare with bcrypt hash
    const match = await bcrypt.compare(password, found.password);
    if (!match) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    const clan = ud.clans.find((c) => c.clanId === found.clanId);

    // Return user session data — NEVER include password
    return res.status(200).json({
      ok: true,
      user: {
        username: found.username,
        displayName: found.displayName,
        role: found.role,
        clanId: found.clanId || null,
        clanName: clan ? clan.clanName : (found.clanId || ''),
        dataFile: clan ? clan.dataFile : null,
      },
    });
  } catch (err) {
    console.error('API login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
