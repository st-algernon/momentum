import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { GoalsService } from '../../services/goals.service';
import { GistService } from '../../services/gist.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-gist-backup-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gist-backup-modal.component.html',
  styleUrl: './gist-backup-modal.component.css'
})
export class GistBackupModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly gistService = inject(GistService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GistBackupModalComponent>);

  token = this.gistService.token();
  gistId = this.gistService.gistId();

  readonly busy = signal(false);

  close(): void {
    this.dialogRef.close();
  }

  async backupNow(): Promise<void> {
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

  async restoreNow(): Promise<void> {
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
      this.close();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Restore failed.');
    } finally {
      this.busy.set(false);
    }
  }

  forget(): void {
    this.gistService.forget();
    this.token = '';
    this.gistId = '';
    this.toast.show('Forgot saved GitHub credentials');
  }
}
