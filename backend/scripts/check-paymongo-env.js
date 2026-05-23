
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const key = String(process.env.PAYMONGO_SECRET_KEY || '').trim();

if (!key) {
  console.log('PAYMONGO_SECRET_KEY: not set → mock GCash/Maya checkout will be used.');
  process.exit(0);
}

if (key.startsWith('pk_')) {
  console.error('PAYMONGO_SECRET_KEY: PUBLIC key (pk_) — checkout will fail.');
  console.error('Fix: PayMongo Dashboard → API Keys → copy Secret key (sk_test_...) into backend/.env');
  process.exit(1);
}

if (!key.startsWith('sk_')) {
  console.error('PAYMONGO_SECRET_KEY: invalid format (expected sk_test_ or sk_live_).');
  process.exit(1);
}

console.log('PAYMONGO_SECRET_KEY: OK (secret key, prefix sk_)');
console.log('Restart backend if you changed .env: Ctrl+C then npm run dev');
process.exit(0);
