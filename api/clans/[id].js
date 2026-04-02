const { readUsers, writeUsers } = require('../_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clanId = decodeURIComponent(req.query.id);

  try {
    if (req.method === 'PUT') {
      const updates = req.body;
      const ud = await readUsers();
      const idx = ud.clans.findIndex((c) => c.clanId === clanId);
      if (idx === -1) return res.status(404).json({ error: 'Clan not found' });
      if (updates.clanName) ud.clans[idx].clanName = updates.clanName;
      if (updates.dataFile) ud.clans[idx].dataFile = updates.dataFile;
      await writeUsers(ud);
      return res.status(200).json({ ok: true, clans: ud.clans });
    }

    if (req.method === 'DELETE') {
      const ud = await readUsers();
      const hasUsers = ud.users.some((u) => u.clanId === clanId && u.role !== 'sysadmin');
      if (hasUsers) return res.status(400).json({ error: 'Không thể xóa clan còn tài khoản' });
      ud.clans = ud.clans.filter((c) => c.clanId !== clanId);
      await writeUsers(ud);
      return res.status(200).json({ ok: true, clans: ud.clans });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API clans/[id] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
