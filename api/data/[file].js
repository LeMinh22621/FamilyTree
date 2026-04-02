const { ghReadJSON, GH_DATA_PATH } = require('../_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const fileName = req.query.file;
  if (!fileName) return res.status(400).json({ error: 'file parameter required' });

  // Validate filename: only allow users.json and data_*.json
  if (fileName !== 'users.json' && !/^data_[\w-]+\.json$/.test(fileName)) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  try {
    const result = await ghReadJSON(`${GH_DATA_PATH()}/${fileName}`);
    if (!result) return res.status(404).json({ error: 'File not found' });
    return res.status(200).json(result.data);
  } catch (err) {
    console.error(`API data/${fileName} error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
