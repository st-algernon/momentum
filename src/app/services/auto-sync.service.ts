import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { GoalsService } from './goals.service';
import { GistService } from './gist.service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** What the nav sync icon should reflect — honest about whether sync is actually happening.
 * 'off' = no token configured at all. 'pending' = token set, but never synced yet. */
export type SyncIndicator = 'off' | 'pending' | 'syncing' | 'synced' | 'error';

const LAST_SYNCED_KEY = 'momentum-last-synced-at';
const DEBOUNCE_MS = 4000;

@Injectable({ providedIn: 'root' })
export class AutoSyncService {
  private readonly goalsService = inject(GoalsService);
  private readonly gistService = inject(GistService);

  readonly status = signal<SyncStatus>('idle');
  readonly lastSyncedAt = signal<number | null>(Number(localStorage.getItem(LAST_SYNCED_KEY)) || null);
  readonly errorMessage = signal<string>('');

  /** Sync runs automatically whenever a token is configured. */
  readonly active = computed(() => this.gistService.token().length > 0);

  readonly indicator = computed<SyncIndicator>(() => {
    if (this.status() === 'syncing') return 'syncing';
    if (this.status() === 'error') return 'error';
    if (this.status() === 'synced' || this.lastSyncedAt() !== null) return 'synced';
    if (this.active()) return 'pending';
    return 'off';
  });

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

      if (!this.gistService.token()) return;

      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.sync(), DEBOUNCE_MS);
    });
  }

  async syncNow(): Promise<void> {
    clearTimeout(this.timer);
    await this.sync();
  }

  /** Clears the saved token/gist ID and this service's own sync state, so the app goes
   *  back to a never-connected state rather than just losing the credentials while still
   *  reporting a stale "synced" status. */
  disconnect(): void {
    clearTimeout(this.timer);
    this.gistService.clearCredentials();
    this.status.set('idle');
    this.errorMessage.set('');
    this.lastSyncedAt.set(null);
    localStorage.removeItem(LAST_SYNCED_KEY);
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
