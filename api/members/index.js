const { readData, writeData, isSafeDataFile } = require('../_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { dataFile, member } = req.body;
    if (!dataFile || !member) return res.status(400).json({ error: 'dataFile and member required' });
    if (!isSafeDataFile(dataFile)) return res.status(400).json({ error: 'Invalid file' });
    const members = await readData(dataFile);
    if (!members) return res.status(404).json({ error: 'File not found' });
    if (members.some((m) => m.id === member.id)) return res.status(409).json({ error: 'ID exists' });
    // Sync voChongIds bidirectionally
    if (member.voChongIds?.length) {
      for (const sid of member.voChongIds) {
        const sp = members.find((m) => m.id === sid);
        if (sp) sp.voChongIds = [...(sp.voChongIds || []), member.id];
      }
    }
    // Sync conIds — update chaId/meId on selected children
    const conIds = member.conIds || [];
    delete member.conIds;
    const parentField = member.gioiTinh === 'Nữ' ? 'meId' : 'chaId';
    for (const cid of conIds) {
      const child = members.find((m) => m.id === cid);
      if (child) child[parentField] = member.id;
    }
    members.push(member);
    await writeData(dataFile, members);
    return res.status(200).json({ ok: true, members });
  } catch (err) {
    console.error('POST /api/members error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
