import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowTrendUp, faBullseye, faCircleInfo, faMedal, faXmark } from '@fortawesome/free-solid-svg-icons';
import { BestMode, Goal, GoalType } from '../../models/goal.model';
import {
  GoalsService,
  OUTCOME_TARGET,
  OUTCOME_UNIT,
  UNIT_OPTIONS,
  dateToISO,
  formatAmount
} from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

export interface GoalModalData {
  mode: 'create' | 'edit';
  goal?: Goal;
  defaultGroupId?: string | null;
}

/**
 * The counting modes as a user picks them, collapsing the stored goalType/bestMode pair into
 * a single choice. Those two fields are a storage concern: presenting them as nested controls
 * hid "pass or fail" until "personal best" was selected, and shifted the form mid-decision.
 */
type GoalMode = 'cumulative' | 'best' | 'outcome';

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

  /** All three compared in one place, so the tooltip helps you choose before selecting —
   *  something the per-mode hint below the control can't do on its own. */
  protected readonly modeTooltip =
    'Total adds every entry up — hours studied, books read, km run. ' +
    'Personal best keeps your highest single entry, like a 100 km ultra hike. ' +
    'Pass or fail logs each attempt as a success or a failure, and one success completes the ' +
    'goal — landing an offer after any number of interviews.';

  protected readonly modes: { value: GoalMode; label: string; icon: IconDefinition }[] = [
    { value: 'cumulative', label: 'Total', icon: faArrowTrendUp },
    // faMedal already marks personal-best goals in the achievements timeline.
    { value: 'best', label: 'Personal best', icon: faMedal },
    { value: 'outcome', label: 'Pass or fail', icon: faBullseye }
  ];

  private readonly initialGroupId = this.isEdit ? this.data.goal?.groupId ?? null : this.data.defaultGroupId ?? null;

  name = this.data.goal?.name ?? '';
  description = this.data.goal?.description ?? '';
  targetAmount: number | null = this.data.goal?.targetAmount ?? null;
  unit = this.data.goal?.unit ?? 'hours';
  mode: GoalMode = GoalModalComponent.modeOf(this.data.goal);
  deadline: Date | null = this.data.goal?.deadline ? new Date(`${this.data.goal.deadline}T12:00:00`) : null;
  groupName = this.groups().find(group => group.id === this.initialGroupId)?.name ?? '';

  private static modeOf(goal: Goal | undefined): GoalMode {
    if (!goal || goal.goalType !== 'best') return 'cumulative';
    return goal.bestMode === 'outcome' ? 'outcome' : 'best';
  }

  close(): void {
    this.dialogRef.close();
  }

  /** Pass/fail goals have nothing to measure: the target is always one success and the unit
   *  is never shown, so both fields are hidden and supplied on submit. */
  protected get isOutcome(): boolean {
    return this.mode === 'outcome';
  }

  protected get canSubmit(): boolean {
    if (!this.name.trim()) return false;
    return this.isOutcome || Number(this.targetAmount) > 0;
  }

  /** Explains the selected mode using the target and unit the user actually entered, so the
   *  copy always matches their goal instead of leaning on a generic example. */
  protected get modeHint(): string {
    if (this.isOutcome) {
      return 'Reached the first time you log a success — failed attempts are kept as history.';
    }
    const target = Number(this.targetAmount);
    const goal = target > 0 ? formatAmount(target, this.unit.trim() || 'units') : 'the target';
    return this.mode === 'best'
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
    if (!this.canSubmit) return;

    // Expand the single picked mode back into the two stored fields.
    const goalType: GoalType = this.mode === 'cumulative' ? 'cumulative' : 'best';
    const bestMode: BestMode = this.mode === 'outcome' ? 'outcome' : 'amount';
    const target = this.isOutcome ? OUTCOME_TARGET : Number(this.targetAmount);
    const unit = this.isOutcome ? OUTCOME_UNIT : this.unit;

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
        unit,
        goalType,
        bestMode,
        deadline,
        groupId
      });
      this.toast.show('Goal updated');
    } else {
      this.goalsService.createGoal({
        name,
        targetAmount: target,
        unit,
        goalType,
        bestMode,
        deadline,
        groupId,
        description
      });
      this.toast.show('Goal created');
    }

    this.dialogRef.close();
  }
}
