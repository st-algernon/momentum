import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Goal, GoalGroup } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { GoalCardComponent } from '../goal-card/goal-card.component';
import { DIALOG_WIDTH } from '../../shared/dialog';
import { GoalModalComponent } from '../goal-modal/goal-modal.component';
import { GroupModalComponent } from '../group-modal/group-modal.component';

@Component({
  selector: 'app-group-section',
  standalone: true,
  imports: [DecimalPipe, MatMenuModule, MatTooltipModule, GoalCardComponent, FaIconComponent],
  templateUrl: './group-section.component.html',
  styleUrl: './group-section.component.css'
})
export class GroupSectionComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly group = input.required<GoalGroup>();
  readonly goals = input.required<Goal[]>();
  readonly interactive = input(true);
  readonly archived = input(false);

  protected readonly percent = computed(() => GoalsService.groupPercent(this.goals()));
  protected readonly achievedCount = computed(() => GoalsService.completedCount(this.goals()));
  protected readonly allComplete = computed(() => GoalsService.allComplete(this.goals()));
  protected readonly sortedGoals = computed(() => GoalsService.sortForDisplay(this.goals()));
  protected readonly faKebab = faEllipsisVertical;

  protected editGroup(): void {
    this.dialog.open(GroupModalComponent, { width: DIALOG_WIDTH, data: { mode: 'edit', group: this.group() } });
  }

  protected addGoalHere(): void {
    this.dialog.open(GoalModalComponent, { width: DIALOG_WIDTH, data: { mode: 'create', defaultGroupId: this.group().id } });
  }

  protected archiveGroup(): void {
    if (!this.allComplete()) return;
    this.goalsService.archiveGroup(this.group().id);
    this.toast.show(`${this.group().name} archived`);
  }

  protected unarchiveGroup(): void {
    this.goalsService.unarchiveGroup(this.group().id);
    this.toast.show(`${this.group().name} unarchived`);
  }

  protected deleteGroup(): void {
    const count = this.goals().length;
    const suffix = count ? ` and its ${count} goal${count === 1 ? '' : 's'}` : '';
    const confirmed = window.confirm(`Delete "${this.group().name}"${suffix}?`);
    if (!confirmed) return;

    this.goalsService.deleteGroup(this.group().id);
    this.toast.show('Group deleted');
  }
}
