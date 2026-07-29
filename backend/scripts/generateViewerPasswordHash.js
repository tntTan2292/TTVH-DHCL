const { hashPassword } = require('../src/services/auth/passwordHash');

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/generateViewerPasswordHash.js "<initial-password>"');
    process.exit(1);
}

console.log('Set this in your .env on the server machine:');
console.log(`QIS_VIEWER_PASSWORD_HASH=${hashPassword(password)}`);
