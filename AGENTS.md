# A Little Somewhere — project instructions

## Direction and stack

A cozy, local personal scrapbook for Journal, Memories, Reflect, Planner, Spin, and Passport.
Use Node.js 24 LTS (minimum 22.12), npm, Vite, strict TypeScript, Tailwind CSS utilities, and custom CSS. Keep semantic HTML and native browser features. React, a backend, a database server, and large UI or animation libraries are unnecessary.

The user explicitly approved these tooling changes and fresh saved data. Do not add compatibility migrations, backups, legacy recovery, old PIN behavior, or Firebase sync. Never contact, modify, seed, or delete the previous database.

## Source map

- `index.html`: application shell and semantic page structure.
- `src/main.ts`: navigation, startup, lifecycle, production updates.
- `src/model.ts`: typed records, validation, dates, recurrence, wheel geometry.
- `src/storage.ts`, `services.ts`, `drafts.ts`: IndexedDB, serialized mutations and date-bound drafts.
- `src/privacy.ts`: Web Crypto passphrase vault.
- `src/journal.ts`, `reflect.ts`, `planner.ts`, `spin.ts`, `passport.ts`: feature behavior.
- `src/ui.ts`, `calendar.ts`: sanitization, errors, photo preparation, dialogs, dates.
- `src/content.ts`: retained activity lists, quotes, daily prompts.
- `src/scrapbook.css`, `styles.css`: retained design and current responsive styling.
- `public/`: canonical install manifest and original icon assets.
- `scripts/build-sw.mjs`: builds `dist/sw.js` from production assets.
- `tests/`: logic and real-browser regression tests; keep artifacts out of releases.

## Data and privacy

Start fresh in IndexedDB `a-little-somewhere-v2`, object store `records`. Never clear unrelated browser storage or read old storage namespaces.

Journal and Memories share a vault encrypted with Web Crypto AES-256-GCM. Derive a non-extractable session key using PBKDF2-SHA-256, a random 16-byte salt, and 600,000 iterations. Generate a fresh 12-byte IV for every encryption. Never persist or log keys, passphrases, or decrypted private content. Explain that forgetting the passphrase prevents recovery. Planner, Reflect, Spin, and Passport remain unencrypted locally.

Read failures and invalid records must block mutation, never become empty successful reads. Writes must await IndexedDB transaction completion. Serialize read-transform-write operations across tabs with Web Locks. Preserve originating date, content, and failed drafts. On locking, complete pending private saves/uploads, abort locking if they fail, close viewers, clear private DOM, drafts, retry closures, and session keys.

Prepare photos before storage and keep them in IndexedDB rather than localStorage. Preserve existing photos and captions on every failure. Sanitize pasted and stored rich HTML; allow only supported formatting and highlight metadata.

## Design and accessibility

Preserve #fff6f8, #fde6ee, #f9cddd, #f2aac3, #e2789b, #c85c82, #5c4353, #fffaf4. Retain Fraunces headings, Quicksand controls, Caveat accents, paper, tape, hearts, and restrained transitions. Avoid generic dashboard cards and excessive glass effects. Keep offline font fallbacks, visible focus, labels, keyboard uploads, modal focus trapping/Escape, reduced motion, and mobile/zoom support.

## Verification and delivery

Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. Browser tests use installed Microsoft Edge; change the Playwright channel explicitly if testing another browser. Keep mocked logic results separate from real browser results. Test navigation races, failed reads/writes, recurrence, concurrent actions, locking, photos, offline reloads, and narrow/desktop layouts.

Keep `PROJECT_HANDOFF.md` current with completed, pending, blocked, and unverified work. A build alone is insufficient evidence of completion. The production release is only `dist/`; exclude repository metadata, dependencies, tests, traces, tools, and user data. Cache only intended successful app assets and remove only this app's obsolete caches. Activate updates through the visible update flow. Do not deploy unless explicitly requested.

## Current checkout and workflow — 29 October 2026

These additions supersede older design/workflow guidance above. The active repository is C:\Users\krist\OneDrive\Documents\GitHub\alittlesomewhere-github\ALittleSomewhere, connected to https://github.com/tineetot/ALittleSomewhere.git. Work here, not in the original sibling ALittleSomewhere workspace. Verify git rev-parse --show-toplevel before edits and before providing commit commands. Preserve existing user changes; do not commit, push or deploy without the user's instruction.

The repository now contains the editable Vite/TypeScript source in src/, public/, scripts/ and tests/, with npm configuration at its root. vercel.json declares Vite, npm ci, npm run build and dist so future pushes can build from source. Older root deployment files are retained; only dist/ is the current build output. The original README and its live-site link are preserved; see DEVELOPMENT.md for current run instructions.

The approved design is moderately decorated cozy stationery: original illustrated stickers, selectable faint backgrounds behind opaque writing surfaces, restrained notebook date turns and individual photo frames. Avoid generic emoji, sentimental filler, footer slogans and repeated explanations. Keep essential privacy warnings and brief contextual save feedback. Use darker supporting accent shades for readable controls.

Journal stickers and Memories frames are optional per-date fields inside the encrypted vault. Preserve existing records and storage namespaces. Clear private decoration controls/DOM on successful lock; retain failed drafts. Passport frames are unencrypted with their Passport records. Background choices use a separate IndexedDB appearance record. Calendar spacers use cal-day--blank, never the padded page-level empty class; keep calendar-cell padding zero and test actual week-row geometry across different months.

After every finished update, include beginner-friendly PowerShell run commands for this checkout. Its local ignored portable runtime is .tools/node-v24.22.1-win-x64: add that folder to the current terminal PATH, then run npm.cmd run dev. Tell the user to open the printed Local URL, keep the terminal open and use Ctrl+C to stop. Dependencies are already present locally; do not reinstall them unless inputs change. Other clones should install Node 24 LTS and run npm ci first. See DEVELOPMENT.md.