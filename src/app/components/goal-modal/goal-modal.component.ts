import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, UNIT_OPTIONS, dateToISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

export interface GoalModalData {
  mode: 'create' | 'edit';
  goal?: Goal;
  defaultGroupId?: string | null;
}

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [FormsModule, MatDatepickerModule, MatAutocompleteModule, FaIconComponent],
  templateUrl: './goal-modal.component.html',
  styleUrl: './goal-modal.component.css'
})
export class GoalModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GoalModalComponent>);
  private readonly data = inject<GoalModalData>(MAT_DIALOG_DATA, { optional: true }) ?? { mode: 'create' };

  protected readonly groups = this.goalsService.groups;
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly faClose = faXmark;

  private readonly initialGroupId = this.isEdit ? this.data.goal?.groupId ?? null : this.data.defaultGroupId ?? null;

  name = this.data.goal?.name ?? '';
  targetAmount: number | null = this.data.goal?.targetAmount ?? null;
  unit = this.data.goal?.unit ?? 'hours';
  deadline: Date | null = this.data.goal?.deadline ? new Date(`${this.data.goal.deadline}T12:00:00`) : null;
  groupName = this.groups().find(group => group.id === this.initialGroupId)?.name ?? '';

  close(): void {
    this.dialogRef.close();
  }

  protected filteredGroupNames(): string[] {
    const query = this.groupName.trim().toLowerCase();
    const names = this.groups().map(group => group.name);
    if (!query) return names;
    return names.filter(name => name.toLowerCase().includes(query));
  }

  submit(): void {
    const name = this.name.trim();
    const target = Number(this.targetAmount);
    if (!name || !target || target <= 0) return;

    const groupNameTrimmed = this.groupName.trim();
    let groupId: string | null = null;
    if (groupNameTrimmed) {
      const existing = this.groups().find(group => group.name.toLowerCase() === groupNameTrimmed.toLowerCase());
      groupId = existing ? existing.id : this.goalsService.createGroup(groupNameTrimmed).id;
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
