# SkillTrack

A lightweight learning progress tracker, built with Angular.

## Features

- Create multiple learning goals
- Set a target number of hours
- Log daily study time and notes
- View completion percentage, remaining hours, streak, and daily average
- See a simple seven-day activity chart
- Export and import backups
- Saves data locally in your browser using `localStorage`

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

Your data is stored only in the current browser. Use **Export data** to create backups.
