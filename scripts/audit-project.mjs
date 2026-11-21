import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const required = ['README.md', '.env.example', '.gitignore', 'tsconfig.json', 'eslint.config.js', 'package-lock.json', 'bundle/index.html'];
for (const file of required) if (!existsSync(file)) failures.push(`Missing required project file: ${file}`);

const protectedPaths = ['.env', '.env.local', '.anna/app.json', '.anna-app/dev.key', 'credentials.json', 'private.pem', 'private.key', 'certificate.p12', 'node_modules/example/index.js'];
const ignored = new Set(execFileSync('git', ['check-ignore', '--stdin'], { encoding: 'utf8', input: protectedPaths.join('\n') + '\n' }).trim().split(/\r?\n/));
for (const file of protectedPaths) if (!ignored.has(file)) failures.push(`Sensitive/generated path not ignored: ${file}`);

const projectFiles = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(file => file && existsSync(file));
function bundleFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? bundleFiles(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const scanned = [...new Set([...projectFiles, ...bundleFiles('bundle')])];
const secretPatterns = [
  /eyJ[A-Za-z0-9_-]{16,}\.eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
];
for (const file of scanned) {
  if (!lstatSync(file).isFile()) continue;
  if (/(^|[\\/])(?:credentials\.json|\.env(?:\..+)?|[^/\\]+\.(?:pem|key|p12))$/i.test(file) && file !== '.env.example') failures.push(`Sensitive filename in project candidates: ${file}`);
  const content = readFileSync(file, 'utf8');
  if (secretPatterns.some(pattern => pattern.test(content))) failures.push(`Potential credential in ${file} (value intentionally omitted)`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Project audit passed: ${required.length} required files, ${protectedPaths.length} ignore checks, ${scanned.length} source/bundle files scanned. No model or network calls.`);
}
