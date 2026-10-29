# Development

The working repository is `C:\Users\krist\OneDrive\Documents\GitHub\alittlesomewhere-github\ALittleSomewhere`.

## Run on this computer

Open this repository folder in VS Code. In a PowerShell terminal:

```powershell
cd 'C:\Users\krist\OneDrive\Documents\GitHub\alittlesomewhere-github\ALittleSomewhere'
$env:PATH = (Join-Path $PWD '.tools\node-v24.22.1-win-x64') + ';' + $env:PATH
npm.cmd run dev
```

Open the Local URL printed in the terminal. Keep the terminal open; Ctrl+C stops it. This computer already has a local portable runtime and installed dependencies in ignored folders. On another clone, install Node.js 24 LTS (minimum 22.12), run `npm ci`, then `npm run dev`.

## Check and build

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
npm.cmd run preview
```

Browser tests use installed Microsoft Edge and start production preview themselves on port 4173. Stop a manual preview before testing. Development normally uses 5173; production preview normally uses 4173. Different origins/ports have separate saved data.

## Commit and push

First verify `git rev-parse --show-toplevel` reports this cloned repository, then review changes:

```powershell
git status
git add .
git diff --cached --stat
git commit -m "feat: add editable stationery app and fix calendar spacing"
git push
```

Do not stage node_modules, .tools, dist, test-results or release ZIPs. They are ignored. Pushing to the branch connected to Vercel can trigger a deployment; the transfer itself does not commit or push anything.

## Source and hosting

- src/: TypeScript, styles, original vector decorations and feature modules.
- public/: install manifest and icon assets.
- scripts/: production worker generation and release verification.
- tests/: logic and real-browser regression coverage.
- vercel.json: installs with npm ci, builds with npm run build, publishes dist/.

Older root assets and static install files are retained from the previous deployment and are not the new build output. Vercel uses dist/. Existing README content and Git history are preserved. File-based Vercel build settings follow https://vercel.com/docs/project-configuration.

All app records remain local to each browser. Journal, its stickers, Memories and its photo frames use the existing encrypted vault and passphrase. Forgetting the passphrase prevents recovery. Planner, Reflect, Spin, Passport and its photo frames remain unencrypted locally. No previous database is contacted or changed. See PROJECT_HANDOFF.md for feature details, actual test results and unverified device/browser behavior.