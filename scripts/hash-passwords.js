/**
 * Migration script: Hash all plaintext passwords in users.json using bcrypt.
 * 
 * Usage: node scripts/hash-passwords.js
 * 
 * This script is idempotent — it detects already-hashed passwords (starting
 * with "$2a$" or "$2b$") and skips them.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const SALT_ROUNDS = 10;

async function main() {
  if (!fs.existsSync(USERS_FILE)) {
    console.error('❌ users.json not found at', USERS_FILE);
    process.exit(1);
  }

  const ud = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  let changed = 0;

  for (const user of ud.users) {
    // Skip if already hashed (bcrypt hashes start with $2a$ or $2b$)
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      console.log(`  ⏭  ${user.username} — already hashed, skipping`);
      continue;
    }

    const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
    user.password = hash;
    changed++;
    console.log(`  ✅ ${user.username} — password hashed`);
  }

  if (changed === 0) {
    console.log('\n✅ All passwords are already hashed. No changes needed.');
    return;
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(ud, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ Done! ${changed} password(s) hashed in ${USERS_FILE}`);
  console.log('⚠️  Remember to sync users.json to GitHub if needed.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
