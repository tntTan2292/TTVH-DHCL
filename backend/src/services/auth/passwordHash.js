const crypto = require('node:crypto');

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const derivedKey = crypto.scryptSync(String(password), salt, KEY_LENGTH).toString('hex');
    return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

function verifyPassword(password, encodedHash) {
    if (typeof encodedHash !== 'string') return false;

    const [prefix, salt, expectedHex] = encodedHash.split('$');
    if (prefix !== HASH_PREFIX || !salt || !expectedHex) return false;

    const actual = crypto.scryptSync(String(password), salt, KEY_LENGTH);
    const expected = Buffer.from(expectedHex, 'hex');

    if (actual.length !== expected.length) return false;

    return crypto.timingSafeEqual(actual, expected);
}

module.exports = {
    hashPassword,
    verifyPassword,
};
