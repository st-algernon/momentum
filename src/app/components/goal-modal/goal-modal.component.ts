import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Goal, GoalType } from '../../models/goal.model';
import { GoalsService, UNIT_OPTIONS, dateToISO, formatAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

export interface GoalModalData {
  mode: 'create' | 'edit';
  goal?: Goal;
  defaultGroupId?: string | null;
}

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [FormsModule, MatDatepickerModule, MatAutocompleteModule, MatTooltipModule, FaIconComponent],
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
  protected readonly faInfo = faCircleInfo;

  /** Examples live here rather than beside either option: shown together the contrast is
   *  clearer, and neither mode gets a static example that may not fit the user's goal. */
  protected readonly goalTypeTooltip =
    'Total suits anything you accumulate — hours studied, books read, km run. ' +
    'Personal best suits a single-attempt result you want to push higher, like a single 100 km ultra hike.';

  private readonly initialGroupId = this.isEdit ? this.data.goal?.groupId ?? null : this.data.defaultGroupId ?? null;

  name = this.data.goal?.name ?? '';
  description = this.data.goal?.description ?? '';
  targetAmount: number | null = this.data.goal?.targetAmount ?? null;
  unit = this.data.goal?.unit ?? 'hours';
  goalType: GoalType = this.data.goal?.goalType ?? 'cumulative';
  deadline: Date | null = this.data.goal?.deadline ? new Date(`${this.data.goal.deadline}T12:00:00`) : null;
  groupName = this.groups().find(group => group.id === this.initialGroupId)?.name ?? '';

  close(): void {
    this.dialogRef.close();
  }

  protected get canSubmit(): boolean {
    return this.name.trim().length > 0 && Number(this.targetAmount) > 0;
  }

  /** Explains the selected mode using the target and unit the user actually entered, so the
   *  copy always matches their goal instead of leaning on a generic example. */
  protected get goalTypeHint(): string {
    const target = Number(this.targetAmount);
    const goal = target > 0 ? formatAmount(target, this.unit.trim() || 'units') : 'the target';
    return this.goalType === 'best'
      ? `Reached when one entry hits ${goal} — earlier entries don't add up.`
      : `Reached when your entries add up to ${goal}.`;
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
    const description = this.description.trim();

    if (this.isEdit && this.data.goal) {
      this.goalsService.updateGoal(this.data.goal.id, {
        name,
        description,
        targetAmount: target,
        unit: this.unit,
        goalType: this.goalType,
        deadline,
        groupId
      });
      this.toast.show('Goal updated');
    } else {
      this.goalsService.createGoal(name, target, this.unit, this.goalType, deadline, groupId, description);
      this.toast.show('Goal created');
    }

    this.dialogRef.close();
  }
}
