import { Injectable, effect, inject, signal } from '@angular/core';
import { GoalsService } from './goals.service';
import { GistService } from './gist.service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const ENABLED_KEY = 'momentum-autosync-enabled';
const LAST_SYNCED_KEY = 'momentum-last-synced-at';
const DEBOUNCE_MS = 4000;

@Injectable({ providedIn: 'root' })
export class AutoSyncService {
  private readonly goalsService = inject(GoalsService);
  private readonly gistService = inject(GistService);

  readonly enabled = signal<boolean>(localStorage.getItem(ENABLED_KEY) === 'true');
  readonly status = signal<SyncStatus>('idle');
  readonly lastSyncedAt = signal<number | null>(Number(localStorage.getItem(LAST_SYNCED_KEY)) || null);
  readonly errorMessage = signal<string>('');

  private timer?: ReturnType<typeof setTimeout>;
  private initialRun = true;

  constructor() {
    effect(() => {
      this.goalsService.goals();
      this.goalsService.groups();

      if (this.initialRun) {
        this.initialRun = false;
        return;
      }

      if (!this.enabled() || !this.gistService.token()) return;

      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.sync(), DEBOUNCE_MS);
    });
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    localStorage.setItem(ENABLED_KEY, String(value));
  }

  async syncNow(): Promise<void> {
    clearTimeout(this.timer);
    await this.sync();
  }

  private async sync(): Promise<void> {
    this.status.set('syncing');
    try {
      await this.gistService.backup(this.goalsService.exportState());
      const now = Date.now();
      this.lastSyncedAt.set(now);
      localStorage.setItem(LAST_SYNCED_KEY, String(now));
      this.status.set('synced');
      this.errorMessage.set('');
    } catch (error) {
      this.status.set('error');
      this.errorMessage.set(error instanceof Error ? error.message : 'Sync failed.');
    }
  }
}
