/**
 * Shared GitHub API helpers for Vercel Serverless Functions.
 * All data is stored on GitHub — no local filesystem.
 *
 * Environment variables required:
 *   GH_OWNER    — GitHub username or org
 *   GH_REPO     — repository name
 *   GH_TOKEN    — Personal Access Token (repo scope)
 *   GH_BRANCH   — branch name (default: main)
 *   GH_DATA_PATH   — folder for JSON data (default: data)
 *   GH_IMAGE_PATH  — folder for images (default: images)
 */

const GH_OWNER = () => process.env.GH_OWNER || '';
const GH_REPO = () => process.env.GH_REPO || '';
const GH_TOKEN = () => process.env.GH_TOKEN || '';
const GH_BRANCH = () => process.env.GH_BRANCH || 'main';
const GH_DATA_PATH = () => process.env.GH_DATA_PATH || 'data';
const GH_IMAGE_PATH = () => process.env.GH_IMAGE_PATH || 'images';

function headers() {
  return {
    Authorization: `token ${GH_TOKEN()}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function isSafeDataFile(f) {
  return /^data_[\w-]+\.json$/.test(f);
}

/** Get a file's content + SHA from GitHub */
async function ghGetFile(filePath) {
  const url = `https://api.github.com/repos/${GH_OWNER()}/${GH_REPO()}/contents/${filePath}?ref=${GH_BRANCH()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  };
}

/** Get JSON data from a file on GitHub */
async function ghReadJSON(filePath) {
  const file = await ghGetFile(filePath);
  if (!file) return null;
  return { data: JSON.parse(file.content), sha: file.sha };
}

/** Write (create or update) a file on GitHub */
async function ghWriteFile(filePath, content, message) {
  // Get current SHA if file exists
  let sha = null;
  const existing = await ghGetFile(filePath);
  if (existing) sha = existing.sha;

  const body = {
    message: message || `Update ${filePath}`,
    content: Buffer.from(content).toString('base64'),
    branch: GH_BRANCH(),
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER()}/${GH_REPO()}/contents/${filePath}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub write failed');
  }
  return await res.json();
}

/** Read users.json from GitHub */
async function readUsers() {
  const result = await ghReadJSON(`${GH_DATA_PATH()}/users.json`);
  if (!result) throw new Error('users.json not found on GitHub');
  return result.data;
}

/** Write users.json to GitHub */
async function writeUsers(data) {
  await ghWriteFile(
    `${GH_DATA_PATH()}/users.json`,
    JSON.stringify(data, null, 2),
    'Update users.json'
  );
}

/** Read a clan data file from GitHub */
async function readData(dataFile) {
  const result = await ghReadJSON(`${GH_DATA_PATH()}/${dataFile}`);
  if (!result) return null;
  return result.data;
}

/** Write a clan data file to GitHub */
async function writeData(dataFile, data) {
  await ghWriteFile(
    `${GH_DATA_PATH()}/${dataFile}`,
    JSON.stringify(data, null, 2),
    `Update ${dataFile}`
  );
}

/** Upload a base64-encoded file to GitHub */
async function ghPutBase64(filePath, base64Content, message) {
  let sha = null;
  try {
    const existing = await ghGetFile(filePath);
    if (existing) sha = existing.sha;
  } catch { /* new file */ }

  const body = {
    message,
    content: base64Content,
    branch: GH_BRANCH(),
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER()}/${GH_REPO()}/contents/${filePath}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub upload failed');
  }
  return await res.json();
}

/** Build the raw content URL for a file */
function rawUrl(filePath) {
  return `https://raw.githubusercontent.com/${GH_OWNER()}/${GH_REPO()}/${GH_BRANCH()}/${filePath}`;
}

module.exports = {
  GH_OWNER, GH_REPO, GH_TOKEN, GH_BRANCH, GH_DATA_PATH, GH_IMAGE_PATH,
  isSafeDataFile, ghGetFile, ghReadJSON, ghWriteFile,
  readUsers, writeUsers, readData, writeData,
  ghPutBase64, rawUrl, headers,
};
