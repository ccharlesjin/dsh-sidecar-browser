#!/usr/bin/env node
/**
 * Build a patched copy of a DSH app.asar from the current installed archive.
 *
 * The patch files are version-specific diffs. This script:
 *   1. validates the archive version
 *   2. extracts the archive to a temporary directory
 *   3. applies patches from patches/<version>/
 *   4. repacks the complete archive (including unpacked entries)
 *
 * It never modifies the installed app.asar and never downloads DSH source.
 *
 * Usage:
 *   node scripts/build.mjs --app-asar "E:/Tools/Deepseek_Harness/resources/app.asar" --version 0.2.1-rc.3
 */
import * as asar from '@electron/asar';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const archive = path.resolve(arg('--app-asar', 'E:/Tools/Deepseek_Harness/resources/app.asar'));
const requestedVersion = String(arg('--version', ''));
const outDir = path.resolve(arg('--out', path.join(process.cwd(), 'dist')));

if (!fs.existsSync(archive)) throw new Error(`app.asar not found: ${archive}`);

const packageJson = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
const version = requestedVersion || String(packageJson.version);
const patchDir = path.resolve(process.cwd(), 'patches', version);

if (String(packageJson.version) !== version) {
  throw new Error(`archive version is ${packageJson.version}, expected ${version}; refusing to apply a mismatched patch`);
}
if (!fs.existsSync(patchDir)) {
  throw new Error(`no patches for DSH ${version}; supported: ${listVersions().join(', ') || '(none)'}`);
}

const manifestPath = path.join(process.cwd(), 'patches', 'manifest.json');
let manifestEntry = null;
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestEntry = manifest.versions?.[version];
  if (!manifestEntry) throw new Error(`DSH ${version} is not listed in patches/manifest.json`);
  if (manifestEntry.tested !== true) throw new Error(`DSH ${version} is listed but not marked tested; refusing to build`);
}

function listVersions() {
  if (!fs.existsSync(path.join(process.cwd(), 'patches'))) return [];
  return fs.readdirSync(path.join(process.cwd(), 'patches'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const patches = fs.readdirSync(patchDir).filter((name) => name.endsWith('.patch')).sort();
if (patches.length === 0) throw new Error(`no .patch files in ${patchDir}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-sidecar-core-'));
const output = path.join(outDir, 'app.asar.patched');
const outputUnpacked = `${output}.unpacked`;

try {
  console.log(`extracting ${archive}`);
  await asar.extractAll(archive, temp);

  for (const patch of patches) {
    const patchPath = path.join(patchDir, patch);
    console.log(`applying ${patch}`);
    const result = spawnSync('git', ['-c', 'core.autocrlf=false', 'apply', '--whitespace=nowarn', '-p1', patchPath], {
      cwd: temp,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(`git apply failed for ${patch}:\n${result.stderr || result.stdout || result.error}`);
    }
  }

  const root = asar.getRawHeader(archive).header;
  const dirs = [];
  const files = [];
  const links = [];

  function walk(node, parent = '') {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const archivePath = parent ? `${parent}/${name}` : name;
      if (entry.files) {
        dirs.push({
          type: 'directory',
          path: archivePath,
          unpacked: entry.unpacked === true,
          stat: { mode: 0o040755, size: 0 },
        });
        walk(entry, archivePath);
      } else if (entry.link) {
        links.push({
          type: 'link',
          path: archivePath,
          unpacked: entry.unpacked === true,
          symlink: entry.link,
          stat: { mode: 0o120777, size: 0 },
        });
      } else {
        const filePath = path.join(temp, archivePath);
        files.push({
          type: 'file',
          path: archivePath,
          unpacked: entry.unpacked === true,
          stat: {
            mode: entry.executable === true ? 0o100755 : 0o100644,
            size: fs.statSync(filePath).size,
          },
          streamGenerator: () => Readable.from([fs.readFileSync(filePath)]),
        });
      }
    }
  }

  walk(root);
  fs.mkdirSync(outDir, { recursive: true });
  for (const stale of [output, outputUnpacked]) {
    if (fs.existsSync(stale)) fs.rmSync(stale, { recursive: true, force: true });
  }
  console.log(`packing ${output}`);
  await asar.createPackageFromStreams(output, [...dirs, ...files, ...links]);

  function fileHash(archivePath) {
    return createHash('sha256').update(asar.extractFile(output, archivePath)).digest('hex');
  }
  if (manifestEntry?.patchedMainSha256) {
    const actual = fileHash('lib/main.js');
    if (actual !== manifestEntry.patchedMainSha256) {
      throw new Error(`patched lib/main.js hash mismatch: ${actual} != ${manifestEntry.patchedMainSha256}`);
    }
  }
  if (manifestEntry?.patchedPreloadSha256) {
    const actual = fileHash('lib/preload-app.cjs');
    if (actual !== manifestEntry.patchedPreloadSha256) {
      throw new Error(`patched lib/preload-app.cjs hash mismatch: ${actual} != ${manifestEntry.patchedPreloadSha256}`);
    }
  }

  const sha256 = createHash('sha256').update(fs.readFileSync(output)).digest('hex');
  const build = {
    appVersion: version,
    builtAt: new Date().toISOString(),
    source: archive,
    archive: output,
    unpacked: outputUnpacked,
    sha256,
    sizeBytes: fs.statSync(output).size,
    patches,
  };
  fs.writeFileSync(path.join(outDir, 'BUILD.json'), `${JSON.stringify(build, null, 2)}\n`);
  console.log(JSON.stringify(build, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
