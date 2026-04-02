const { readData, writeData, isSafeDataFile } = require('../_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const memberId = decodeURIComponent(req.query.id);

  try {
    // PUT — update member
    if (req.method === 'PUT') {
      const { dataFile, member } = req.body;
      if (!dataFile || !member) return res.status(400).json({ error: 'dataFile and member required' });
      if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
      const members = await readData(dataFile);
      if (!members) return res.status(404).json({ error: 'File not found' });
      const idx = members.findIndex((m) => m.id === memberId);
      if (idx === -1) return res.status(404).json({ error: 'Member not found' });

      const oldSpouses = members[idx].voChongIds || [];
      const newSpouses = member.voChongIds || [];
      for (const sid of oldSpouses) {
        if (!newSpouses.includes(sid)) {
          const sp = members.find((m) => m.id === sid);
          if (sp) sp.voChongIds = (sp.voChongIds || []).filter((x) => x !== memberId);
        }
      }
      for (const sid of newSpouses) {
        if (!oldSpouses.includes(sid)) {
          const sp = members.find((m) => m.id === sid);
          if (sp && !(sp.voChongIds || []).includes(memberId)) {
            sp.voChongIds = [...(sp.voChongIds || []), memberId];
          }
        }
      }

      members[idx] = { ...members[idx], ...member };
      await writeData(dataFile, members);
      return res.status(200).json({ ok: true, members });
    }

    // DELETE — delete member
    if (req.method === 'DELETE') {
      const { dataFile } = req.body;
      if (!dataFile) return res.status(400).json({ error: 'dataFile required' });
      if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
      let members = await readData(dataFile);
      if (!members) return res.status(404).json({ error: 'File not found' });
      members.forEach((m) => {
        if (m.voChongIds?.includes(memberId)) m.voChongIds = m.voChongIds.filter((x) => x !== memberId);
      });
      members = members.filter((m) => m.id !== memberId);
      await writeData(dataFile, members);
      return res.status(200).json({ ok: true, members });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API members/[id] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
