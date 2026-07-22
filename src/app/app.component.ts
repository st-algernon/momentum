import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AppState } from './models/goal.model';
import { GoalsService, todayISO } from './services/goals.service';
import { ToastService } from './services/toast.service';
import { GoalListComponent } from './components/goal-list/goal-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { WeekChartComponent } from './components/week-chart/week-chart.component';
import { GoalModalComponent } from './components/goal-modal/goal-modal.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GoalListComponent, DashboardComponent, WeekChartComponent, GoalModalComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  @ViewChild(GoalModalComponent) private goalModal!: GoalModalComponent;
  @ViewChild('importFile') private importFileRef!: ElementRef<HTMLInputElement>;

  protected openGoalModal(): void {
    this.goalModal.open();
  }

  protected deleteActiveGoal(): void {
    const goal = this.goalsService.activeGoal();
    if (!goal) return;
    const confirmed = window.confirm(`Delete "${goal.name}" and all of its activity?`);
    if (!confirmed) return;

    this.goalsService.deleteGoal(goal.id);
    this.toast.show('Goal deleted');
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
      if (!imported || !Array.isArray(imported.goals)) throw new Error('Invalid backup');
      this.goalsService.importState(imported);
      this.toast.show('Backup imported');
    } catch {
      window.alert('That file is not a valid SkillTrack backup.');
    } finally {
      input.value = '';
    }
  }
}
