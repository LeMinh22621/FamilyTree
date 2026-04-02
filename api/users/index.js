const { readUsers, writeUsers } = require('../_lib/github');
const bcrypt = require('bcryptjs');

// Strip password from user objects before sending to client
const sanitize = (users) => users.map(({ password, ...u }) => u);
const SALT_ROUNDS = 10;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const ud = await readUsers();
      return res.status(200).json({ users: sanitize(ud.users), clans: ud.clans });
    }

    if (req.method === 'POST') {
      const user = req.body;
      if (!user.username || !user.password || !user.displayName || !user.role) {
        return res.status(400).json({ error: 'username, password, displayName, role required' });
      }
      const ud = await readUsers();
      if (ud.users.some((u) => u.username === user.username)) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      ud.users.push({
        username: user.username,
        password: hashedPassword,
        displayName: user.displayName,
        role: user.role,
        clanId: user.clanId || null,
      });
      await writeUsers(ud);
      return res.status(200).json({ ok: true, users: sanitize(ud.users) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API users error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
