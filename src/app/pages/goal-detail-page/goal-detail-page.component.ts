import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { GoalsService, formatAmount, todayISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { LogFormComponent } from '../../components/log-form/log-form.component';
import { HistoryListComponent } from '../../components/history-list/history-list.component';
import { TrendChartComponent } from '../../components/trend-chart/trend-chart.component';
import { GoalModalComponent } from '../../components/goal-modal/goal-modal.component';
import { DIALOG_WIDTH } from '../../components/goal-card/goal-card.component';

@Component({
  selector: 'app-goal-detail-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatMenuModule, MatTooltipModule, FaIconComponent, LogFormComponent, HistoryListComponent, TrendChartComponent],
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

  protected readonly isComplete = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.isGoalComplete(goal) : false;
  });

  protected readonly completedOn = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.completedOn(goal) : null;
  });

  protected readonly highest = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.highestLoggedAmount(goal) : 0;
  });

  /** For 'best' goals the highest log *is* the completed total, so showing it twice is
   *  redundant — the third tile shows the attempt count there instead. */
  protected readonly isBestType = computed(() => this.goal()?.goalType === 'best');
  protected readonly attempts = computed(() => this.goal()?.logs.length ?? 0);

  protected readonly average = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.dailyAverageOverDays(goal, 'all') : 0;
  });

  /** Null when there's no deadline set. Compares against completedOn for a finished goal
   *  (a fixed, historical comparison) or against today for one still in progress (so it
   *  keeps counting down/up live as time passes). */
  protected readonly deadlineStatus = computed<{ text: string; tone: 'good' | 'neutral' | 'overdue' } | null>(() => {
    const goal = this.goal();
    if (!goal || !goal.deadline) return null;

    const complete = this.isComplete();
    const referenceDate = complete ? this.completedOn() : todayISO();
    if (!referenceDate) return null;

    const diffDays = GoalsService.deadlineDeltaDays(goal, referenceDate);
    if (diffDays === null) return null;

    if (complete) {
      if (diffDays > 0) return { text: `Beat deadline by ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'good' };
      if (diffDays === 0) return { text: 'Right on deadline', tone: 'good' };
      const late = Math.abs(diffDays);
      return { text: `Finished ${late} day${late === 1 ? '' : 's'} after deadline`, tone: 'neutral' };
    }

    if (diffDays > 0) return { text: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'neutral' };
    if (diffDays === 0) return { text: 'Due today', tone: 'neutral' };
    const overdue = Math.abs(diffDays);
    return { text: `${overdue} day${overdue === 1 ? '' : 's'} overdue`, tone: 'overdue' };
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
