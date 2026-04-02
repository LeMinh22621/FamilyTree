const { readUsers, writeUsers } = require('../_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const ud = await readUsers();
      return res.status(200).json({ clans: ud.clans });
    }

    if (req.method === 'POST') {
      const clan = req.body;
      if (!clan.clanId || !clan.clanName || !clan.dataFile) return res.status(400).json({ error: 'clanId, clanName, dataFile required' });
      const ud = await readUsers();
      if (ud.clans.some((c) => c.clanId === clan.clanId)) return res.status(409).json({ error: 'Clan ID đã tồn tại' });
      ud.clans.push({ clanId: clan.clanId, clanName: clan.clanName, dataFile: clan.dataFile });
      await writeUsers(ud);
      // Create empty data file on GitHub
      const { ghWriteFile, GH_DATA_PATH } = require('../_lib/github');
      try {
        await ghWriteFile(`${GH_DATA_PATH()}/${clan.dataFile}`, '[]', `Create ${clan.dataFile}`);
      } catch { /* may already exist */ }
      return res.status(200).json({ ok: true, clans: ud.clans });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API clans error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
