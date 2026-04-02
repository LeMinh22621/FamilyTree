module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).end('Missing url');

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Referer': new URL(imageUrl).origin + '/',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) return res.status(upstream.status).end('Upstream error');

    const ct = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).end(buf);
  } catch (err) {
    console.error('Image proxy error:', err.message);
    return res.status(502).end('Proxy error');
  }
};
