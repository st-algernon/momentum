import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowsRotate, faChartSimple, faGear, faHouse, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { AutoSyncService } from './services/auto-sync.service';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatTooltipModule, FaIconComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly autoSync = inject(AutoSyncService);
  protected readonly faSync = faArrowsRotate;
  protected readonly faDashboard = faHouse;
  protected readonly faAchievements = faTrophy;
  protected readonly faReports = faChartSimple;
  protected readonly faSettings = faGear;

  protected syncLabel(): string {
    switch (this.autoSync.indicator()) {
      case 'syncing':
        return 'Syncing…';
      case 'synced': {
        const lastSyncedAt = this.autoSync.lastSyncedAt();
        return lastSyncedAt ? `Last sync - ${this.formatSyncTime(lastSyncedAt)}` : 'Synced';
      }
      case 'error':
        return `Sync failed: ${this.autoSync.errorMessage()}`;
      case 'pending':
        return 'Click to sync for the first time';
      default:
        return 'Click to sync — add a token in Settings first';
    }
  }

  protected async triggerSync(): Promise<void> {
    await this.autoSync.syncNow();
  }

  private formatSyncTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
