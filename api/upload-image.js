const { ghPutBase64, GH_OWNER, GH_REPO, GH_BRANCH, GH_IMAGE_PATH, GH_TOKEN } = require('./_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GH_TOKEN()) return res.status(400).json({ error: 'GitHub not configured' });

  try {
    const { fileName, base64Data, clanId } = req.body;
    if (!fileName || !base64Data) return res.status(400).json({ error: 'fileName and base64Data required' });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const finalName = `${timestamp}_${safeName}`;
    const ghPath = `${GH_IMAGE_PATH()}/${clanId || 'general'}/${finalName}`;

    await ghPutBase64(ghPath, base64Data, `Upload image: ${finalName}`);
    const imageUrl = `https://raw.githubusercontent.com/${GH_OWNER()}/${GH_REPO()}/${GH_BRANCH()}/${ghPath}`;

    return res.status(200).json({ ok: true, url: imageUrl, path: ghPath });
  } catch (err) {
    console.error('Upload image error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
};
