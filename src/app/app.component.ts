import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
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

  protected syncLabel(): string {
    switch (this.autoSync.indicator()) {
      case 'syncing':
        return 'Syncing to gist…';
      case 'synced':
        return 'Synced to gist';
      case 'error':
        return 'Sync failed — open settings';
      default:
        return 'Gist sync off — open settings';
    }
  }
}
