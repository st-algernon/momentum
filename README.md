# SkillTrack

A lightweight progress tracker, built with Angular. Not just for studying — track anything with a
target and a unit: hours, interviews, applications, whatever.

## Features

- Organize work into **groups** (a general goal, e.g. "Find a new job") each containing **sub-goals**
  (e.g. "Interviews counter", "Applications counter") with their own target and unit
- See progress per sub-goal, and an overall rolled-up progress bar for the whole group
- Log dated entries with notes against any sub-goal
- View completion percentage, remaining amount, streak, and daily average
- See a simple seven-day activity chart
- Export/import a local JSON backup, or back up to a private GitHub Gist
- Saves data locally in your browser using `localStorage`

## Backing up to a GitHub Gist

Click **Backup to gist** in the toolbar, then:

1. Create a [personal access token](https://github.com/settings/tokens/new?scopes=gist) with the `gist` scope.
2. Paste it in. The first backup creates a new private gist; later backups update the same one.
3. Use **Restore from gist** on another device/browser to pull the latest backup down.

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

Your data is stored only in the current browser. Use **Export data** or **Backup to gist** to create backups.
