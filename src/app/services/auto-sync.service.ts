import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { GoalsService } from './goals.service';
import { GistService } from './gist.service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** What the nav sync icon should reflect — honest about whether sync is actually happening.
 * 'off' = no token configured at all. 'pending' = there are changes not yet pushed. */
export type SyncIndicator = 'off' | 'pending' | 'syncing' | 'synced' | 'error';

const LAST_SYNCED_KEY = 'momentum-last-synced-at';
const PENDING_KEY = 'momentum-sync-pending';
const DEBOUNCE_MS = 4000;
/** Don't re-pull on every tab focus — a quick app-switch shouldn't hit the API again. */
const MIN_PULL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AutoSyncService {
  private readonly goalsService = inject(GoalsService);
  private readonly gistService = inject(GistService);

  readonly status = signal<SyncStatus>('idle');
  readonly lastSyncedAt = signal<number | null>(Number(localStorage.getItem(LAST_SYNCED_KEY)) || null);
  readonly errorMessage = signal<string>('');

  /** Local edits that haven't reached the gist yet. Persisted, so a sync that never made it
   *  out (backgrounded tab, closed browser, dead network) is retried on the next load
   *  instead of being lost silently. */
  readonly pending = signal<boolean>(localStorage.getItem(PENDING_KEY) === 'true');

  readonly active = computed(() => this.gistService.token().length > 0);

  readonly indicator = computed<SyncIndicator>(() => {
    if (!this.active()) return 'off';
    if (this.status() === 'syncing') return 'syncing';
    if (this.status() === 'error') return 'error';
    // Deliberately checked before lastSyncedAt: having synced at some point in the past says
    // nothing about whether the changes made since then have gone out.
    if (this.pending()) return 'pending';
    return this.lastSyncedAt() !== null ? 'synced' : 'pending';
  });

  private timer?: ReturnType<typeof setTimeout>;
  private initialRun = true;
  private inFlight?: Promise<void>;
  private lastPulledAt = 0;
  /** Serialized state as of the last successful push. Lets the change-effect tell a real
   *  user edit apart from the state this service itself just wrote after a merge — without
   *  it, applying a merge would schedule another sync, which would merge again, forever. */
  private lastPushed = '';

  constructor() {
    effect(() => {
      const snapshot = JSON.stringify(this.goalsService.exportState());

      if (this.initialRun) {
        this.initialRun = false;
        return;
      }
      if (snapshot === this.lastPushed) return;

      this.setPending(true);
      if (!this.gistService.token()) return;

      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.sync(), DEBOUNCE_MS);
    });

    // Mobile browsers freeze or discard backgrounded pages, often well inside the debounce
    // window — without this, switching apps right after an edit drops the sync entirely.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
      else this.pullIfStale();
    });
    window.addEventListener('pagehide', () => this.flush());

    // Startup pull picks up whatever another device pushed while this one was closed, and
    // doubles as the retry for anything left pending from a previous session.
    setTimeout(() => void this.sync());
  }

  async syncNow(): Promise<void> {
    clearTimeout(this.timer);
    await this.sync();
  }

  disconnect(): void {
    clearTimeout(this.timer);
    this.gistService.clearCredentials();
    this.status.set('idle');
    this.errorMessage.set('');
    this.lastSyncedAt.set(null);
    this.lastPushed = '';
    this.setPending(false);
    localStorage.removeItem(LAST_SYNCED_KEY);
  }

  private pullIfStale(): void {
    if (!this.gistService.token()) return;
    if (Date.now() - this.lastPulledAt < MIN_PULL_INTERVAL_MS) return;
    void this.sync();
  }

  private flush(): void {
    if (!this.pending() || !this.gistService.token()) return;
    clearTimeout(this.timer);
    void this.sync();
  }

  /**
   * One sync pass: pull the remote copy, merge it into local, push the result.
   *
   * Always pulling before pushing is what makes two devices converge instead of clobbering
   * each other — pushing local state blind would erase whatever the other device added
   * since this one last looked.
   */
  private async sync(): Promise<void> {
    if (!this.gistService.token()) return;
    // Collapse overlapping triggers (debounce firing while a focus-pull is in flight, etc.)
    // so two passes can't interleave a merge with a push.
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      this.status.set('syncing');
      try {
        const remote = await this.gistService.pull();
        this.lastPulledAt = Date.now();

        const merged = remote ? this.goalsService.mergeRemote(remote) : this.goalsService.exportState();

        // Set before applying/pushing so the effect sees the merge as "already synced"
        // rather than as a fresh edit needing another round trip.
        this.lastPushed = JSON.stringify(merged);
        await this.gistService.backup(merged);

        const now = Date.now();
        this.lastSyncedAt.set(now);
        localStorage.setItem(LAST_SYNCED_KEY, String(now));
        this.setPending(false);
        this.status.set('synced');
        this.errorMessage.set('');
      } catch (error) {
        // pending stays set and lastPushed is cleared, so the next trigger retries rather
        // than mistaking the un-pushed state for something already synced.
        this.lastPushed = '';
        this.status.set('error');
        this.errorMessage.set(error instanceof Error ? error.message : 'Sync failed.');
      } finally {
        this.inFlight = undefined;
      }
    })();

    return this.inFlight;
  }

  private setPending(value: boolean): void {
    this.pending.set(value);
    if (value) localStorage.setItem(PENDING_KEY, 'true');
    else localStorage.removeItem(PENDING_KEY);
  }
}
