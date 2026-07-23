import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Goal } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';
import { GoalCardComponent, DIALOG_WIDTH } from '../../components/goal-card/goal-card.component';
import { GroupSectionComponent } from '../../components/group-section/group-section.component';
import { GoalModalComponent } from '../../components/goal-modal/goal-modal.component';
import { GroupModalComponent } from '../../components/group-modal/group-modal.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [GoalCardComponent, GroupSectionComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly dialog = inject(MatDialog);

  protected readonly ungroupedGoals = computed(() => this.goalsService.ungroupedGoals());
  protected readonly hasAnything = computed(() => this.goalsService.goals().length > 0 || this.goalsService.groups().length > 0);

  protected readonly goalsByGroup = computed(() => {
    const map = new Map<string, Goal[]>();
    for (const group of this.goalsService.groups()) {
      map.set(group.id, this.goalsService.goalsInGroup(group.id));
    }
    return map;
  });

  protected readonly groups = computed(() => {
    const goalsByGroup = this.goalsByGroup();
    return [...this.goalsService.groups()].sort(
      (a, b) => GoalsService.lastActivityAt(goalsByGroup.get(b.id) ?? []) - GoalsService.lastActivityAt(goalsByGroup.get(a.id) ?? [])
    );
  });

  protected openNewGoal(): void {
    this.dialog.open(GoalModalComponent, { width: DIALOG_WIDTH, data: { mode: 'create' } });
  }

  protected openNewGroup(): void {
    this.dialog.open(GroupModalComponent, { width: DIALOG_WIDTH, data: { mode: 'create' } });
  }
}
