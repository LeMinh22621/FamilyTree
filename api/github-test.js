const { GH_OWNER, GH_REPO, GH_TOKEN } = require('./_lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GH_TOKEN() || !GH_OWNER() || !GH_REPO()) {
    return res.status(400).json({ error: 'GitHub not configured' });
  }

  try {
    const r = await fetch(`https://api.github.com/repos/${GH_OWNER()}/${GH_REPO()}`, {
      headers: { Authorization: `token ${GH_TOKEN()}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!r.ok) {
      const e = await r.json();
      return res.status(400).json({ error: `GitHub: ${e.message || r.statusText}` });
    }
    const repo = await r.json();
    return res.status(200).json({ ok: true, repoName: repo.full_name, defaultBranch: repo.default_branch });
  } catch (err) {
    return res.status(500).json({ error: `Connection error: ${err.message}` });
  }
};
