import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Goal } from '../../models/goal.model';
import { GoalsService, dateToISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

const NEW_GROUP_OPTION = '__new_group__';

export interface GoalModalData {
  mode: 'create' | 'edit';
  goal?: Goal;
  defaultGroupId?: string | null;
}

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
  private readonly data = inject<GoalModalData>(MAT_DIALOG_DATA, { optional: true }) ?? { mode: 'create' };

  protected readonly groups = this.goalsService.groups;
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly newGroupSentinel = NEW_GROUP_OPTION;

  name = this.data.goal?.name ?? '';
  targetAmount: number | null = this.data.goal?.targetAmount ?? null;
  unit = this.data.goal?.unit ?? 'hours';
  deadline: Date | null = this.data.goal?.deadline ? new Date(`${this.data.goal.deadline}T12:00:00`) : null;
  groupSelection: string = this.isEdit ? this.data.goal?.groupId ?? '' : this.data.defaultGroupId ?? '';
  newGroupName = '';

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const name = this.name.trim();
    const target = Number(this.targetAmount);
    if (!name || !target || target <= 0) return;

    let groupId: string | null = this.groupSelection || null;
    if (this.groupSelection === NEW_GROUP_OPTION) {
      const newName = this.newGroupName.trim();
      if (!newName) return;
      groupId = this.goalsService.createGroup(newName).id;
    }

    const deadline = this.deadline ? dateToISO(this.deadline) : null;

    if (this.isEdit && this.data.goal) {
      this.goalsService.updateGoal(this.data.goal.id, { name, targetAmount: target, unit: this.unit, deadline, groupId });
      this.toast.show('Goal updated');
    } else {
      this.goalsService.createGoal(name, target, this.unit, deadline, groupId);
      this.toast.show('Goal created');
    }

    this.dialogRef.close();
  }
}
