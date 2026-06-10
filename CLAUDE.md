# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Raycast extension that searches WHMCS clients locally. WHMCS is web hosting billing/support software; the extension talks to its API (`GetClients` action) using credentials stored in Raycast extension preferences.

## Commands

- `npm run dev` — `ray develop`: builds, imports the extension into Raycast under "Development", hot-reloads on save, streams `console.log` to the terminal. Exit with Ctrl+C.
- `npm run build` — `ray build`: one-off validation build.
- `npm run lint` / `npm run fix-lint` — `ray lint`: ESLint + Prettier + Raycast extension validation.

There are no tests.

## Architecture

Two commands that communicate only through a JSON file — search never touches the network:

- **Client Sync** (`src/client-sync.ts`, `no-view` mode): fetches up to 5,000 clients from the WHMCS API, filters to status "Active" by default, normalizes each into a `Client` shape with pre-built admin URLs (profile, billable items, open support ticket), sorts by `name` ("Lastname, Firstname"), and writes `clients.json` to `environment.supportPath`.
- **Client Search** (`src/client-search.tsx`, `view` mode): reads `clients.json` and fuzzy-searches it with Fuse.js (keys: `name`, `email`, `company`; threshold 0.3; extended search). Shows an empty view prompting a sync if the file is missing.

The `Client` type is duplicated in both files; if you change its shape, update both and consider whether existing `clients.json` files on disk remain compatible.

Dependencies are intentionally minimal (`@raycast/api`, `@raycast/utils`, `fuse.js`). Use native `fetch` — `node-fetch` was deliberately removed.

## Known Quirk

`client-sync.ts` reads `props.launchContext?.modifiers?.cmd` to decide whether to include inactive clients, but Raycast only populates `launchContext` for programmatic `launchCommand` calls — not for modifier keys held while launching from root search. So Cmd+Return likely never triggers the include-inactive path.

## Releasing

Two tracks:

1. **Version history**: commit and push to `origin/main` (github.com/mwender/whmcs-client-search).
2. **Raycast Store**: `npm run publish` (`npx @raycast/api@latest publish`) — validates, forks `raycast/extensions`, and opens a PR for Raycast's review. The update goes live when the PR merges.

For every user-facing change, add a `CHANGELOG.md` entry dated `{PR_MERGE_DATE}` (literal placeholder — Raycast stamps the real date at PR merge).

Note: this working copy lives in `~/.raycast/extensions/`, the same directory where Raycast materializes installed extensions. It is the git checkout; all edits happen here.
