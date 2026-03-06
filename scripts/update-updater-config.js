#!/usr/bin/env node
/**
 * Injects update endpoint into tauri.conf.json from package.json repository.
 * Run before build so the updater uses the correct GitHub Releases URL.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");
const conf = JSON.parse(readFileSync(tauriConfPath, "utf8"));

const repo = pkg.repository;
let endpoint;
if (typeof repo === "string") {
  const match = repo.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i) || repo.match(/^([^/]+\/[^/]+)$/);
  endpoint = match ? `https://github.com/${match[1].replace(".git", "")}/releases/latest/download/latest.json` : null;
} else if (repo?.url) {
  const match = repo.url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i);
  endpoint = match ? `https://github.com/${match[1].replace(".git", "")}/releases/latest/download/latest.json` : null;
} else {
  endpoint = null;
}

if (endpoint && conf.plugins?.updater) {
  conf.plugins.updater.endpoints = [endpoint];
  writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2));
  console.log("[update-updater-config] Set endpoint:", endpoint);
}
