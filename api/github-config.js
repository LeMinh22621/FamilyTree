const { GH_OWNER, GH_REPO, GH_BRANCH, GH_DATA_PATH, GH_IMAGE_PATH, GH_TOKEN } = require('./_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Return config from env vars (token masked)
  const token = GH_TOKEN();
  return res.status(200).json({
    owner: GH_OWNER(),
    repo: GH_REPO(),
    branch: GH_BRANCH(),
    dataPath: GH_DATA_PATH(),
    imagePath: GH_IMAGE_PATH(),
    token: token ? '••••••' + token.slice(-4) : '',
    enabled: !!token,
  });
};
