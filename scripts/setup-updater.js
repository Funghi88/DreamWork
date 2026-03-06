#!/usr/bin/env node
/**
 * One-time setup for auto-updates.
 * Run: npm run setup-updater
 *
 * If keys/ already exist, updates tauri.conf.json with the pubkey.
 * Otherwise, prints instructions to generate keys first.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const keysDir = join(root, "keys");
const keyPath = join(keysDir, "dreamwork.key");
const pubPath = keyPath + ".pub";
const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");

if (!existsSync(pubPath)) {
  if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true });
  console.log(`
\x1b[33mNo signing keys found.\x1b[0m Run this first (it will prompt for a password):

  npm run tauri signer generate -- -w keys/dreamwork.key

Then run \x1b[32mnpm run setup-updater\x1b[0m again.
`);
  process.exit(1);
}

const pubContent = readFileSync(pubPath, "utf8").trim();
const conf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
if (conf.plugins?.updater) {
  conf.plugins.updater.pubkey = pubContent;
  writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2));
  console.log("Updated tauri.conf.json with public key");
}

console.log(`
\x1b[32mSetup complete.\x1b[0m

Next: Add \x1b[32mTAURI_SIGNING_PRIVATE_KEY\x1b[0m to GitHub Secrets (Settings → Secrets → Actions).
Value: paste the contents of \x1b[33mkeys/dreamwork.key\x1b[0m

Then push to \x1b[32mrelease\x1b[0m branch or create a tag (e.g. v0.1.0) to publish.
`);
