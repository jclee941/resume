const path = require('node:path');

const TEST_ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const cryptoPromise = import(path.join(__dirname, '../../../packages/shared/src/crypto/index.js'));

async function encryptSession(plaintext) {
  const { encrypt } = await cryptoPromise;
  return encrypt(plaintext, { ENCRYPTION_KEY: TEST_ENCRYPTION_KEY });
}

module.exports = { TEST_ENCRYPTION_KEY, encryptSession };
