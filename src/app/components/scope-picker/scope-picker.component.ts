import { Component, computed, inject, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { GoalsService } from '../../services/goals.service';

export type ReportScope = { type: 'all' } | { type: 'group'; groupId: string } | { type: 'goal'; goalId: string };

@Component({
  selector: 'app-scope-picker',
  standalone: true,
  imports: [MatMenuModule],
  templateUrl: './scope-picker.component.html',
  styleUrl: './scope-picker.component.css'
})
export class ScopePickerComponent {
  private readonly goalsService = inject(GoalsService);

  readonly scope = input.required<ReportScope>();
  readonly scopeChange = output<ReportScope>();

  protected readonly activeGroups = computed(() => this.goalsService.activeGroups());
  protected readonly archivedGroups = computed(() => this.goalsService.archivedGroups());
  protected readonly ungroupedGoals = computed(() => this.goalsService.activeUngroupedGoals());
  protected readonly archivedUngroupedGoals = computed(() => this.goalsService.archivedUngroupedGoals());

  protected goalsInGroup(groupId: string) {
    return this.goalsService.goalsInGroup(groupId);
  }

  protected currentLabel(): string {
    const scope = this.scope();
    if (scope.type === 'group') return this.goalsService.groupById(scope.groupId)?.name ?? 'Choose…';
    if (scope.type === 'goal') return this.goalsService.goalById(scope.goalId)?.name ?? 'Choose…';
    return 'Choose…';
  }

  protected selectGroup(groupId: string): void {
    this.scopeChange.emit({ type: 'group', groupId });
  }

  protected selectGoal(goalId: string): void {
    this.scopeChange.emit({ type: 'goal', goalId });
  }
}
