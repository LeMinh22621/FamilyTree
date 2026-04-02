/**
 * Returns a proxied URL for external images that may be blocked by CORS/referrer policies
 * (e.g. Facebook, Instagram, etc.).
 *
 * - If the URL is empty/null → returns empty string
 * - If the URL is a relative path or from GitHub raw → return as-is
 * - If the URL is from a known blocked domain → proxy through /api/image-proxy
 * - Otherwise → return as-is
 */

const BLOCKED_HOSTS = [
  'scontent.',        // Facebook CDN
  'fbcdn.net',
  'fbcdn.com',
  'facebook.com',
  'fbsbx.com',
  'instagram.com',
  'cdninstagram.com',
  'lookaside.fbsbx',
  'external.',
  'platform-lookaside',
];

export function proxyImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Relative paths, data URIs, or blob URLs — no proxy needed
  if (trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Check if the host is known to block hotlinking
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    const needsProxy = BLOCKED_HOSTS.some((h) => hostname.includes(h));
    if (needsProxy) {
      return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // Invalid URL, return as-is
  }

  return trimmed;
}
