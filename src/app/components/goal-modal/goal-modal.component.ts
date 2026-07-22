import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { GoalsService, dateToISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [FormsModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './goal-modal.component.html',
  styleUrl: './goal-modal.component.css'
})
export class GoalModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GoalModalComponent>);

  protected readonly group = this.goalsService.activeGroup;

  name = '';
  targetAmount: number | null = null;
  unit = 'hours';
  deadline: Date | null = null;

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const group = this.group();
    const name = this.name.trim();
    const target = Number(this.targetAmount);
    if (!group || !name || !target || target <= 0) return;

    this.goalsService.createGoal(group.id, name, target, this.unit, this.deadline ? dateToISO(this.deadline) : null);
    this.toast.show('Goal created');
    this.dialogRef.close();
  }
}
