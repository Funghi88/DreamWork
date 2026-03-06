# DreamWork

Lightweight screen recorder with circular webcam overlay and whiteboard. Built with Tauri + React for a small footprint (~3–7MB vs Electron's 150MB+).

## Run

```bash
npm install
npm run tauri dev
```

To test in a regular browser (helps isolate Tauri/WebView issues):
```bash
npm run dev
```
Then open http://localhost:1420

**Live Meeting** (requires signaling server):
```bash
# Terminal 1 - Start signaling server
npm run signaling

# Terminal 2 - Start app
npm run tauri dev
```

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
3. Update `repository` in `package.json` if your repo is elsewhere (e.g. `"repository": "github.com/your-username/dreamwork"`)
4. Release: push to the `release` branch, or create a tag (e.g. `git tag v0.1.0 && git push --tags`). Ensure `version` in `src-tauri/tauri.conf.json` matches the tag

## Features

1. **Capture Screen** — System picker to choose screen, window, or app to share
2. **Start Camera** — Webcam with circular PiP; drag to reposition
3. **Avatar** — Size, shape (circle/rounded), decor (simple/glow/dashed), or use an image
4. **Audio** — Mic and system audio with volume sliders
5. **Whiteboard** — Excalidraw overlay for drawing
6. **Live Meeting** — WebRTC video conferencing with chat, screen share, recording, virtual backgrounds, live transcription (run `npm run signaling` first)
7. **Record** — Records screen + webcam composite; Save or Copy when done

## Troubleshooting

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

## Tech

- Tauri 2 (Rust + WebView)
- React + TypeScript + Vite
- Tailwind CSS v4 + Shadcn/UI
- `getDisplayMedia` + `getUserMedia` + `MediaRecorder` + Canvas 2D
