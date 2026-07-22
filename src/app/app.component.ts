import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppState } from './models/goal.model';
import { GoalsService, todayISO } from './services/goals.service';
import { ToastService } from './services/toast.service';
import { GroupListComponent } from './components/group-list/group-list.component';
import { GroupSummaryComponent } from './components/group-summary/group-summary.component';
import { GoalListComponent } from './components/goal-list/goal-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { WeekChartComponent } from './components/week-chart/week-chart.component';
import { GroupModalComponent } from './components/group-modal/group-modal.component';
import { GoalModalComponent } from './components/goal-modal/goal-modal.component';
import { GistBackupModalComponent } from './components/gist-backup-modal/gist-backup-modal.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    GroupListComponent,
    GroupSummaryComponent,
    GoalListComponent,
    DashboardComponent,
    WeekChartComponent,
    ToastComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  @ViewChild('importFile') private importFileRef!: ElementRef<HTMLInputElement>;

  private readonly dialogWidth = 'min(520px, calc(100vw - 28px))';

  protected openGroupModal(): void {
    this.dialog.open(GroupModalComponent, { width: this.dialogWidth });
  }

  protected openGoalModal(): void {
    this.dialog.open(GoalModalComponent, { width: this.dialogWidth });
  }

  protected openGistBackupModal(): void {
    this.dialog.open(GistBackupModalComponent, { width: this.dialogWidth });
  }

  protected deleteActiveGoal(): void {
    const group = this.goalsService.activeGroup();
    const goal = this.goalsService.activeGoal();
    if (!group || !goal) return;
    const confirmed = window.confirm(`Delete "${goal.name}" and all of its activity?`);
    if (!confirmed) return;

    this.goalsService.deleteGoal(group.id, goal.id);
    this.toast.show('Sub-goal deleted');
  }

  protected deleteActiveGroup(): void {
    const group = this.goalsService.activeGroup();
    if (!group) return;
    const confirmed = window.confirm(`Delete "${group.name}" and all of its sub-goals and activity?`);
    if (!confirmed) return;

    this.goalsService.deleteGroup(group.id);
    this.toast.show('Group deleted');
  }

  protected exportData(): void {
    const blob = new Blob([JSON.stringify(this.goalsService.exportState(), null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `skilltrack-backup-${todayISO()}.json`;
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
      if (!imported || !Array.isArray(imported.groups)) throw new Error('Invalid backup');
      this.goalsService.importState(imported);
      this.toast.show('Backup imported');
    } catch {
      window.alert('That file is not a valid SkillTrack backup.');
    } finally {
      input.value = '';
    }
  }
}
