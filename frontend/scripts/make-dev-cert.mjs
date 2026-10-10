// Creates the self-signed HTTPS certificate used by the QIS V2 frontend (QIS-HTTPS-LAN-01).
//
//   node scripts/make-dev-cert.mjs          create frontend/certs/dev-cert.pem + dev-key.pem (skips if present)
//   node scripts/make-dev-cert.mjs --force  recreate (use after the server's IP address changed)
//
// The certificate names localhost, 127.0.0.1, this computer's name and every IPv4 address of this computer,
// so https://localhost:5178 and https://<LAN address>:5178 both match. It is self-signed: a browser shows a
// one-time warning per computer until dev-cert.pem is installed as a trusted certificate on that computer.
// Needs OpenSSL (it ships with Git for Windows). The private key stays in frontend/certs (git-ignored).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const certDir = path.join(frontendDir, 'certs');
const certPath = path.join(certDir, 'dev-cert.pem');
const keyPath = path.join(certDir, 'dev-key.pem');
const force = process.argv.includes('--force');

if (!force && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log(`Certificate already exists: ${certPath}\nUse --force to recreate it (for example after the IP address changed).`);
  process.exit(0);
}

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === 'IPv4')
  .map((entry) => entry.address);
const ips = [...new Set(['127.0.0.1', ...addresses])];
const names = [...new Set(['localhost', os.hostname()])];
const subjectAltName = [...names.map((name) => `DNS:${name}`), ...ips.map((ip) => `IP:${ip}`)].join(',');

function findOpenssl() {
  const candidates = [
    'openssl',
    'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  ];
  return candidates.find((candidate) => spawnSync(candidate, ['version'], { stdio: 'ignore' }).status === 0);
}

const openssl = findOpenssl();
if (!openssl) {
  console.error('OpenSSL was not found. Install Git for Windows (it includes OpenSSL) or add openssl to PATH, then run this again.');
  process.exit(1);
}

fs.mkdirSync(certDir, { recursive: true });
const result = spawnSync(openssl, [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', keyPath, '-out', certPath,
  '-days', '3650',
  '-subj', '/CN=QIS V2 LAN',
  '-addext', `subjectAltName=${subjectAltName}`,
  '-addext', 'keyUsage=digitalSignature,keyEncipherment',
  '-addext', 'extendedKeyUsage=serverAuth',
], { encoding: 'utf8' });

if (result.status !== 0) {
  console.error(result.stderr || 'OpenSSL failed.');
  process.exit(result.status || 1);
}
console.log(`Created ${certPath}\nNames: ${subjectAltName}\nRestart the frontend, then open https://localhost:5178 or https://<this computer's address>:5178`);
