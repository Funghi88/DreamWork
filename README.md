# DreamWork

Lightweight screen recorder with circular webcam overlay and whiteboard. Built with Tauri + React for a small footprint (~3–7MB vs Electron's 150MB+).

## Run

```bash
npm install
npm run tauri dev
```

To test in a regular browser (helps isolate Tauri/WebView issues):
```bash
npm run dev:web
```
Then open http://localhost:5173 (uses port 5173 so it doesn't conflict with `npm run tauri dev` on 1420)

**Live Meeting** (requires signaling server):
```bash
# Terminal 1 - Start signaling server
npm run signaling

# Terminal 2 - Start app
npm run tauri dev
```

In production (desktop + web), the app connects to a deployed signaling server. Deploy via Render Blueprint (see Deploy to Web) — it runs both the app and signaling server.

**Test Live Meeting with multiple users** (dev mode):
```bash
# Terminal 1
npm run signaling

# Terminal 2 - Use browser for easy multi-tab testing
npm run dev
```
Then open http://localhost:1420 in **2+ browser tabs** (or windows). In each tab:
1. Enter a different name (e.g. "Alice", "Bob")
2. Use the same Room ID (copy from first tab, or both click "New" and paste one ID)
3. Click Join Meeting

You can also use an incognito/private window, or a different browser (Chrome + Safari) for separate camera/mic sessions.

## Build .app / .dmg (macOS)

```bash
npm run tauri build
```

Output in `src-tauri/target/release/bundle/`:
- **DreamWork.app** — Double-click to run
- **DreamWork.dmg** — Installer

### Auto-updates

The app checks for updates on startup and installs + relaunches automatically. **One-time setup:**

1. Run `npm run tauri signer generate -- -w keys/dreamwork.key` (prompts for password), then `npm run setup-updater` — updates config with your public key
2. Add these GitHub Secrets (Settings → Secrets → Actions):
   - `TAURI_SIGNING_PRIVATE_KEY` — contents of `keys/dreamwork.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSPHRASE` — the password you set when generating the key
   - `VITE_SIGNALING_URL` — (optional) signaling server URL for Live Meeting; defaults to `https://dreamwork-signaling.onrender.com` if unset
   - **macOS notarization** (optional, for installs without Gatekeeper warning): `APPLE_ID`, `APPLE_PASSWORD` (app-specific password from appleid.apple.com), `APPLE_TEAM_ID`
3. Update `repository` in `package.json` if your repo is elsewhere (e.g. `"repository": "github.com/your-username/dreamwork"`)
4. Release: push to the `release` branch, or create a tag (e.g. `git tag v0.1.0 && git push --tags`). Ensure `version` in `src-tauri/tauri.conf.json` matches the tag

### How updates work

- **Desktop app:** Run `npm run tauri build` locally to produce a new `.app`/`.dmg` (macOS) or `.exe` (Windows) with the latest features. Users with auto-updates enabled get new versions when you push releases to GitHub.
- **Web (dreamwork.onrender.com):** Render deploys from your GitHub repo. It typically redeploys on each push to the connected branch. GitHub Actions passing is not required for the web deploy — Render builds from the repo directly.
- **GitHub Actions:** The release workflow builds desktop installers for macOS, Linux, and Windows. If the Windows job fails (e.g. exit code 1), check the Actions logs. Common causes: missing `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSPHRASE` secrets, or MSVC toolchain issues on the runner.

## Features

1. **Capture Screen** — System picker to choose screen, window, or app to share
2. **Start Camera** — Webcam with circular PiP; drag to reposition
3. **Avatar** — Size, shape (circle/rounded), decor (simple/glow/dashed), or use an image
4. **Audio** — Mic and system audio with volume sliders
5. **Whiteboard** — Excalidraw overlay for drawing
6. **Live Meeting** — WebRTC video conferencing with chat, screen share, recording, virtual backgrounds, live transcription (run `npm run signaling` first)
7. **Record** — Records screen + webcam composite; Save or Copy when done

## Troubleshooting

**"Apple cannot verify" / Gatekeeper blocks install on Mac?** Two options: (1) **Notarize** — add `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` to GitHub Secrets (requires [Apple Developer](https://developer.apple.com) $99/yr). (2) **Workaround** — right-click the app → Open → Open. Or: System Settings → Privacy & Security → scroll to the app → click "Open Anyway".

**Camera not showing in full-page whiteboard?** Try running in a regular browser first (`npm run dev` → http://localhost:1420). If it works there but not in Tauri, it may be a WebView limitation on macOS. Start the camera before opening full-page whiteboard.

## Deploy to Web (Render)

Deploy the web version to [Render](https://render.com):

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Static Site**
3. Connect your GitHub repo
4. Use the `render.yaml` in the repo, or set manually:
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
5. Deploy

The `render.yaml` in the repo configures this automatically when you use **Blueprint** (New → Blueprint).

**Note:** Screen capture, camera, and recording work in the browser. Live Meeting requires a separate signaling server. Some Tauri-specific features (e.g. auto-updates) are desktop-only.

**Live Meeting not working on Render?** Ensure both services from the Blueprint are deployed: `dreamwork` (static site) and `dreamwork-signaling` (WebSocket server). On free tier, the signaling server sleeps after ~15 min of inactivity—first connection can take 30–60s. To keep it awake, add an [UptimeRobot](https://uptimerobot.com) monitor pinging `https://dreamwork-signaling.onrender.com/health` every 10 minutes.

## Tech

- Tauri 2 (Rust + WebView)
- React + TypeScript + Vite
- Tailwind CSS v4 + Shadcn/UI
- `getDisplayMedia` + `getUserMedia` + `MediaRecorder` + Canvas 2D
