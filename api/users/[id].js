const { readUsers, writeUsers } = require('../_lib/github');
const bcrypt = require('bcryptjs');

// Strip password from user objects before sending to client
const sanitize = (users) => users.map(({ password, ...u }) => u);
const SALT_ROUNDS = 10;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const username = decodeURIComponent(req.query.id);

  try {
    if (req.method === 'PUT') {
      const updates = req.body;
      const ud = await readUsers();
      const idx = ud.users.findIndex((u) => u.username === username);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      if (updates.password) ud.users[idx].password = await bcrypt.hash(updates.password, SALT_ROUNDS);
      if (updates.displayName) ud.users[idx].displayName = updates.displayName;
      if (updates.role) ud.users[idx].role = updates.role;
      if (updates.clanId !== undefined) ud.users[idx].clanId = updates.clanId;
      await writeUsers(ud);
      return res.status(200).json({ ok: true, users: sanitize(ud.users) });
    }

    if (req.method === 'DELETE') {
      const ud = await readUsers();
      const target = ud.users.find((u) => u.username === username);
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.role === 'sysadmin') return res.status(400).json({ error: 'Không thể xóa tài khoản sysadmin' });
      ud.users = ud.users.filter((u) => u.username !== username);
      await writeUsers(ud);
      return res.status(200).json({ ok: true, users: sanitize(ud.users) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API users/[id] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
