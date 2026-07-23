import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { GoalsService, formatAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { LogFormComponent } from '../../components/log-form/log-form.component';
import { HistoryListComponent } from '../../components/history-list/history-list.component';
import { WeekChartComponent } from '../../components/week-chart/week-chart.component';
import { GoalModalComponent } from '../../components/goal-modal/goal-modal.component';
import { DIALOG_WIDTH } from '../../components/goal-card/goal-card.component';

@Component({
  selector: 'app-goal-detail-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MatMenuModule, MatTooltipModule, FaIconComponent, LogFormComponent, HistoryListComponent, WeekChartComponent],
  templateUrl: './goal-detail-page.component.html',
  styleUrl: './goal-detail-page.component.css'
})
export class GoalDetailPageComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly goalId = input.required<string>();

  protected readonly faKebab = faEllipsisVertical;

  protected readonly goal = computed(() => this.goalsService.goalById(this.goalId()));
  protected readonly group = computed(() => this.goalsService.groupById(this.goal()?.groupId));

  protected readonly completed = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.totalAmount(goal) : 0;
  });

  protected readonly remaining = computed(() => {
    const goal = this.goal();
    return goal ? Math.max(0, goal.targetAmount - this.completed()) : 0;
  });

  protected readonly percent = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.goalPercent(goal) : 0;
  });

  protected readonly streak = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.currentStreak(goal) : 0;
  });

  protected readonly average = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.dailyAverage(goal) : 0;
  });

  protected formatAmount = formatAmount;

  protected editGoal(): void {
    const goal = this.goal();
    if (!goal) return;
    this.dialog.open(GoalModalComponent, { width: DIALOG_WIDTH, data: { mode: 'edit', goal } });
  }

  protected deleteGoal(): void {
    const goal = this.goal();
    if (!goal) return;
    const confirmed = window.confirm(`Delete "${goal.name}" and all of its activity?`);
    if (!confirmed) return;

    this.goalsService.deleteGoal(goal.id);
    this.toast.show('Goal deleted');
    this.router.navigateByUrl('/');
  }
}
