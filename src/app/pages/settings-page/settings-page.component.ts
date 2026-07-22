import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppState } from '../../models/goal.model';
import { GoalsService, todayISO } from '../../services/goals.service';
import { GistService } from '../../services/gist.service';
import { AutoSyncService } from '../../services/auto-sync.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly gistService = inject(GistService);
  protected readonly autoSync = inject(AutoSyncService);
  private readonly toast = inject(ToastService);

  @ViewChild('importFile') private importFileRef!: ElementRef<HTMLInputElement>;

  token = this.gistService.token();
  gistId = this.gistService.gistId();

  readonly busy = signal(false);

  protected toggleAutoSync(event: Event): void {
    this.autoSync.setEnabled((event.target as HTMLInputElement).checked);
  }

  protected async backupNow(): Promise<void> {
    if (!this.token.trim()) {
      this.toast.error('Add a GitHub personal access token with the "gist" scope first.');
      return;
    }

    this.gistService.setCredentials(this.token.trim(), this.gistId.trim());
    this.busy.set(true);
    try {
      const id = await this.gistService.backup(this.goalsService.exportState());
      this.gistId = id;
      this.toast.show('Backed up to gist');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Backup failed.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async restoreNow(): Promise<void> {
    if (!this.token.trim()) {
      this.toast.error('Add a GitHub personal access token with the "gist" scope first.');
      return;
    }

    const confirmed = window.confirm('This will replace all local data with the backup from the gist. Continue?');
    if (!confirmed) return;

    this.gistService.setCredentials(this.token.trim(), this.gistId.trim());
    this.busy.set(true);
    try {
      const state = await this.gistService.restore();
      this.goalsService.importState(state);
      this.toast.show('Restored from gist');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Restore failed.');
    } finally {
      this.busy.set(false);
    }
  }

  protected forgetToken(): void {
    this.gistService.forget();
    this.token = '';
    this.gistId = '';
    this.autoSync.setEnabled(false);
    this.toast.show('Forgot saved GitHub credentials');
  }

  protected exportData(): void {
    const blob = new Blob([JSON.stringify(this.goalsService.exportState(), null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `momentum-backup-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast.show('Backup exported');
  }

  protected triggerImport(): void {
    this.importFileRef.nativeElement.click();
  }

  protected async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text()) as AppState;
      if (!imported || !Array.isArray(imported.groups) || !Array.isArray(imported.goals)) {
        throw new Error('Invalid backup');
      }
      this.goalsService.importState(imported);
      this.toast.show('Backup imported');
    } catch {
      window.alert('That file is not a valid Momentum backup.');
    } finally {
      input.value = '';
    }
  }
}
