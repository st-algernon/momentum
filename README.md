# Momentum

A lightweight progress tracker, built with Angular. Not just for studying — track anything with a
target and a unit: hours, interviews, applications, whatever you're working toward.

## Features

- Create **goals** with a target and a unit (hours, interviews, applications, anything) —
  optionally organized into **groups** (e.g. "Find a new job" containing "Interviews",
  "Applications", "Offers")
- **Dashboard** — every goal at a glance, grouped or not, with a rolled-up progress bar per group
- **Goal page** — log dated entries with notes, see completion %, remaining amount, streak, daily
  average, and a 7-day activity chart
- **Statistics page** — a clean, read-only summary of everything, designed to screenshot and share
- **Settings page** — configure backups
- Edit or delete any goal/group from its context menu (⋮)
- Export/import a local JSON backup, or back up to a private GitHub Gist — with optional automatic
  background sync
- Saves data locally in your browser using `localStorage`

## Backing up to a GitHub Gist

Open **Settings**, then:

1. Create a [personal access token](https://github.com/settings/tokens/new?scopes=gist) with the `gist` scope.
2. Paste it in and press **Save**. The first sync creates a new private gist; later syncs update
   the same one.
3. From then on it syncs automatically a few seconds after you log progress. **Sync now** pushes
   immediately, **Restore from gist** pulls the stored copy back down (use this to pick up changes
   made on another device), and **Disconnect** clears the token from this browser.

The token is stored only in this browser's `localStorage` and is sent only to `api.github.com` — never
to any other server. Anyone with access to this browser profile can read it, so use a token scoped to
`gist` only, and revoke it from GitHub's settings if you ever need to.

## Development

Requires Node.js 18.19+ and npm.

```bash
npm install
npm start
```

Then visit `http://localhost:4200`.

## Build

```bash
npm run build
```

Output is written to `dist/progress-tracker/browser`.

## Deployment

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the app and publishes it to GitHub Pages.

To enable it on a new repo: **Settings → Pages → Source → GitHub Actions**.

## Important

Your data is stored only in the current browser. Use **Export data** or gist sync (both in
**Settings**) to create backups.
