import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, formatAmount, isOutcomeGoal } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { GoalModalComponent } from '../goal-modal/goal-modal.component';
import { DIALOG_WIDTH } from '../../shared/dialog';

@Component({
  selector: 'app-goal-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MatMenuModule, MatTooltipModule, FaIconComponent],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.css'
})
export class GoalCardComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly goal = input.required<Goal>();
  readonly interactive = input(true);
  readonly archived = input(false);

  protected readonly faKebab = faEllipsisVertical;

  protected readonly groups = this.goalsService.groups;
  protected readonly percent = computed(() => GoalsService.goalPercent(this.goal()));
  protected readonly completedAmount = computed(() => GoalsService.totalAmount(this.goal()));
  protected readonly isComplete = computed(() => GoalsService.isGoalComplete(this.goal()));
  protected readonly isUngrouped = computed(() => !this.goal().groupId);

  /** "3 attempts · not yet" reads far better than "0 times of 1 times" for a pass/fail goal. */
  protected readonly caption = computed(() => {
    const goal = this.goal();
    if (isOutcomeGoal(goal)) {
      const attempts = goal.logs.length;
      const label = `${attempts} attempt${attempts === 1 ? '' : 's'}`;
      return `${label} · ${this.isComplete() ? 'achieved' : 'not yet'}`;
    }
    return `${formatAmount(this.completedAmount(), goal.unit)} of ${formatAmount(goal.targetAmount, goal.unit)}`;
  });

  protected formatAmount = formatAmount;

  protected editGoal(): void {
    this.dialog.open(GoalModalComponent, { width: DIALOG_WIDTH, data: { mode: 'edit', goal: this.goal() } });
  }

  protected moveTo(groupId: string | null): void {
    this.goalsService.moveGoalToGroup(this.goal().id, groupId);
    this.toast.show('Goal moved');
  }

  protected deleteGoal(): void {
    const confirmed = window.confirm(`Delete "${this.goal().name}" and all of its activity?`);
    if (!confirmed) return;
    this.goalsService.deleteGoal(this.goal().id);
    this.toast.show('Goal deleted');
  }

  protected archiveGoal(): void {
    if (!this.isComplete()) return;
    this.goalsService.archiveGoal(this.goal().id);
    this.toast.show(`${this.goal().name} archived`);
  }

  protected unarchiveGoal(): void {
    this.goalsService.unarchiveGoal(this.goal().id);
    this.toast.show(`${this.goal().name} unarchived`);
  }
}
