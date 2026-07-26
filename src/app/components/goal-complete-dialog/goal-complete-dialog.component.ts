import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrophy, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';

export interface GoalCompleteDialogData {
  goal: Goal;
}

const MS_PER_DAY = 86400000;

@Component({
  selector: 'app-goal-complete-dialog',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './goal-complete-dialog.component.html',
  styleUrl: './goal-complete-dialog.component.css'
})
export class GoalCompleteDialogComponent {
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<GoalCompleteDialogComponent>);
  private readonly data = inject<GoalCompleteDialogData>(MAT_DIALOG_DATA);

  protected readonly goal = this.data.goal;
  protected readonly faTrophy = faTrophy;
  protected readonly faClose = faXmark;
  protected readonly confettiPieces = Array.from({ length: 14 }, (_, i) => i);

  protected readonly total = GoalsService.totalAmount(this.goal);
  protected readonly completedOn = GoalsService.completedOn(this.goal);
  protected readonly logCount = this.goal.logs.length;
  protected readonly daysElapsed = this.computeDaysElapsed();
  protected readonly deadlineMessage = this.computeDeadlineMessage();

  protected formatAmount = formatAmount;

  protected viewReport(): void {
    this.dialogRef.close();
    this.router.navigateByUrl(`/reports?goal=${this.goal.id}`);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  /** Calendar days from the first log to the one that crossed the target. */
  private computeDaysElapsed(): number {
    const dates = this.goal.logs.map(log => log.date).sort();
    if (!dates.length || !this.completedOn) return 0;
    const first = new Date(`${dates[0]}T12:00:00`);
    const done = new Date(`${this.completedOn}T12:00:00`);
    return Math.max(0, Math.round((done.getTime() - first.getTime()) / MS_PER_DAY));
  }

  private computeDeadlineMessage(): string | null {
    if (!this.goal.deadline || !this.completedOn) return null;
    const deadline = new Date(`${this.goal.deadline}T12:00:00`);
    const done = new Date(`${this.completedOn}T12:00:00`);
    const diffDays = Math.round((deadline.getTime() - done.getTime()) / MS_PER_DAY);

    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} ahead of your deadline`;
    if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} past your deadline`;
    return 'Right on your deadline';
  }
}
