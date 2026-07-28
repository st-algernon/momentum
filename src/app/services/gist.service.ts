import { Injectable, signal } from '@angular/core';
import { AppState } from '../models/goal.model';

const TOKEN_KEY = 'momentum-gist-token';
const GIST_ID_KEY = 'momentum-gist-id';
const LEGACY_TOKEN_KEY = 'skilltrack-gist-token';
const LEGACY_GIST_ID_KEY = 'skilltrack-gist-id';
const GIST_FILENAME = 'momentum-backup.json';
const LEGACY_GIST_FILENAME = 'skilltrack-backup.json';

function readWithLegacyFallback(key: string, legacyKey: string): string {
  const value = localStorage.getItem(key);
  if (value) return value;
  return localStorage.getItem(legacyKey) ?? '';
}

@Injectable({ providedIn: 'root' })
export class GistService {
  readonly token = signal<string>(readWithLegacyFallback(TOKEN_KEY, LEGACY_TOKEN_KEY));
  readonly gistId = signal<string>(readWithLegacyFallback(GIST_ID_KEY, LEGACY_GIST_ID_KEY));

  setCredentials(token: string, gistId: string): void {
    this.token.set(token);
    this.gistId.set(gistId);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(GIST_ID_KEY, gistId);
  }

  clearCredentials(): void {
    this.token.set('');
    this.gistId.set('');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIST_ID_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_GIST_ID_KEY);
  }

  async backup(state: AppState): Promise<string> {
    const token = this.token();
    if (!token) throw new Error('Add a GitHub token first.');

    const body = {
      description: 'Momentum backup',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(state, null, 2) } }
    };

    const existingId = this.gistId();
    const url = existingId ? `https://api.github.com/gists/${existingId}` : 'https://api.github.com/gists';
    const method = existingId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub responded with ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (!existingId) {
      this.gistId.set(json.id);
      localStorage.setItem(GIST_ID_KEY, json.id);
    }
    return json.id as string;
  }

  async restore(): Promise<AppState> {
    const token = this.token();
    const gistId = this.gistId();
    if (!token) throw new Error('Add a GitHub token first.');
    if (!gistId) throw new Error('No gist ID set yet — back up once first, or paste an existing gist ID.');

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });

    if (!response.ok) {
      throw new Error(`GitHub responded with ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const file = json.files?.[GIST_FILENAME] ?? json.files?.[LEGACY_GIST_FILENAME];
    if (!file) throw new Error(`Gist has no "${GIST_FILENAME}" file.`);

    const content = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.groups) || !Array.isArray(parsed.goals)) {
      throw new Error('Backup file in the gist is not valid.');
    }
    return parsed as AppState;
  }
}
