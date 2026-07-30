import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, amountStepFor, dateToISO, isOutcomeGoal, isValidLogAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { GoalCompleteDialogComponent } from '../goal-complete-dialog/goal-complete-dialog.component';
import { DIALOG_WIDTH } from '../../shared/dialog';

@Component({
  selector: 'app-log-form',
  standalone: true,
  imports: [DatePipe, FormsModule, MatDatepickerModule, FaIconComponent],
  templateUrl: './log-form.component.html',
  styleUrl: './log-form.component.css'
})
export class LogFormComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly goal = input.required<Goal>();

  protected readonly faComplete = faCircleCheck;

  date: Date | null = new Date();
  amount: number | null = null;
  /** Pass/fail goals log this instead of an amount; bound as a string because that's what a
   *  radio group's value attribute gives back. Defaults to 'fail' — most attempts are misses,
   *  and it keeps a success (which completes the goal) from being one careless tap away. */
  outcome: 'success' | 'fail' = 'fail';

  /** Once revealed the form stays open for the rest of this view — no need to persist it. */
  protected readonly showFormAnyway = signal(false);

  protected readonly isComplete = computed(() => GoalsService.isGoalComplete(this.goal()));
  protected readonly isBestType = computed(() => this.goal().goalType === 'best');
  protected readonly isOutcome = computed(() => isOutcomeGoal(this.goal()));
  protected readonly completedOn = computed(() => GoalsService.completedOn(this.goal()));

  protected get amountStep(): number {
    return amountStepFor(this.goal().unit);
  }

  private get loggedAmount(): number {
    if (this.isOutcome()) return this.outcome === 'success' ? 1 : 0;
    return Number(this.amount);
  }

  protected get canSubmit(): boolean {
    if (this.date === null) return false;
    if (!this.isOutcome() && this.amount === null) return false;
    return isValidLogAmount(this.goal(), this.loggedAmount);
  }

  submit(): void {
    const date = this.date;
    if (!date || !this.canSubmit) return;

    const goalId = this.goal().id;
    const { justCompleted } = this.goalsService.addLog(goalId, dateToISO(date), this.loggedAmount, '');

    this.amount = null;
    this.outcome = 'fail';

    if (justCompleted) {
      const updatedGoal = this.goalsService.goalById(goalId);
      if (updatedGoal) {
        this.dialog.open(GoalCompleteDialogComponent, { width: DIALOG_WIDTH, data: { goal: updatedGoal } });
      }
    } else {
      this.toast.show('Progress added');
    }
  }
}
