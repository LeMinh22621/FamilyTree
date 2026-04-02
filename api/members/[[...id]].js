const { readData, writeData, isSafeDataFile } = require('./_lib/github');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method, query, body } = req;
  const memberId = query.id; // from /api/members/[id]

  try {
    // POST /api/members — add member
    if (method === 'POST' && !memberId) {
      const { dataFile, member } = body;
      if (!dataFile || !member) return res.status(400).json({ error: 'dataFile and member required' });
      if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
      const members = await readData(dataFile);
      if (!members) return res.status(404).json({ error: 'File not found' });
      if (members.some((m) => m.id === member.id)) return res.status(409).json({ error: 'ID exists' });
      if (member.voChongIds?.length) {
        for (const sid of member.voChongIds) {
          const sp = members.find((m) => m.id === sid);
          if (sp) sp.voChongIds = [...(sp.voChongIds || []), member.id];
        }
      }
      members.push(member);
      await writeData(dataFile, members);
      return res.status(200).json({ ok: true, members });
    }

    // PUT /api/members/:id — update member
    if (method === 'PUT' && memberId) {
      const id = decodeURIComponent(memberId);
      const { dataFile, member } = body;
      if (!dataFile || !member) return res.status(400).json({ error: 'dataFile and member required' });
      if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
      const members = await readData(dataFile);
      if (!members) return res.status(404).json({ error: 'File not found' });
      const idx = members.findIndex((m) => m.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Member not found' });

      // Sync voChongIds bidirectionally
      const oldSpouses = members[idx].voChongIds || [];
      const newSpouses = member.voChongIds || [];
      for (const sid of oldSpouses) {
        if (!newSpouses.includes(sid)) {
          const sp = members.find((m) => m.id === sid);
          if (sp) sp.voChongIds = (sp.voChongIds || []).filter((x) => x !== id);
        }
      }
      for (const sid of newSpouses) {
        if (!oldSpouses.includes(sid)) {
          const sp = members.find((m) => m.id === sid);
          if (sp && !(sp.voChongIds || []).includes(id)) {
            sp.voChongIds = [...(sp.voChongIds || []), id];
          }
        }
      }

      members[idx] = { ...members[idx], ...member };
      await writeData(dataFile, members);
      return res.status(200).json({ ok: true, members });
    }

    // DELETE /api/members/:id — delete member
    if (method === 'DELETE' && memberId) {
      const id = decodeURIComponent(memberId);
      const { dataFile } = body;
      if (!dataFile) return res.status(400).json({ error: 'dataFile required' });
      if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
      let members = await readData(dataFile);
      if (!members) return res.status(404).json({ error: 'File not found' });
      members.forEach((m) => {
        if (m.voChongIds?.includes(id)) m.voChongIds = m.voChongIds.filter((x) => x !== id);
      });
      members = members.filter((m) => m.id !== id);
      await writeData(dataFile, members);
      return res.status(200).json({ ok: true, members });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API members error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
