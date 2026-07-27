import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';
import { GoalCardComponent, DIALOG_WIDTH } from '../../components/goal-card/goal-card.component';
import { GroupSectionComponent } from '../../components/group-section/group-section.component';
import { GoalModalComponent } from '../../components/goal-modal/goal-modal.component';
import { GroupModalComponent } from '../../components/group-modal/group-modal.component';

/** A view preference, not data — deliberately kept out of AppState/Gist sync. */
const ARCHIVED_EXPANDED_KEY = 'momentum-archived-expanded';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [FaIconComponent, GoalCardComponent, GroupSectionComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly dialog = inject(MatDialog);

  protected readonly faChevron = faChevronRight;

  protected readonly ungroupedGoals = computed(() =>
    GoalsService.sortForDisplay(this.goalsService.activeUngroupedGoals())
  );
  protected readonly archivedUngroupedGoals = computed(() => this.goalsService.archivedUngroupedGoals());
  protected readonly hasAnything = computed(() => this.goalsService.goals().length > 0 || this.goalsService.groups().length > 0);

  protected readonly goalsByGroup = computed(() => {
    const map = new Map<string, Goal[]>();
    for (const group of this.goalsService.groups()) {
      map.set(group.id, this.goalsService.goalsInGroup(group.id));
    }
    return map;
  });

  protected readonly activeGroups = computed(() => {
    const goalsByGroup = this.goalsByGroup();
    return this.goalsService
      .activeGroups()
      .sort(
        (a, b) =>
          GoalsService.lastActivityAt(goalsByGroup.get(b.id) ?? []) - GoalsService.lastActivityAt(goalsByGroup.get(a.id) ?? [])
      );
  });

  protected readonly archivedGroups = computed(() => this.goalsService.archivedGroups());

  protected readonly hasArchivedContent = computed(() => this.archivedGroups().length > 0 || this.archivedUngroupedGoals().length > 0);

  protected readonly archivedSummary = computed(() => {
    const groupCount = this.archivedGroups().length;
    const goalCount = this.archivedUngroupedGoals().length;
    const parts: string[] = [];
    if (groupCount) parts.push(`${groupCount} group${groupCount === 1 ? '' : 's'}`);
    if (goalCount) parts.push(`${goalCount} goal${goalCount === 1 ? '' : 's'}`);
    return parts.join(' · ');
  });

  protected readonly hasActiveContent = computed(() => this.ungroupedGoals().length > 0 || this.activeGroups().length > 0);

  protected readonly archivedExpanded = signal(localStorage.getItem(ARCHIVED_EXPANDED_KEY) === 'true');

  protected toggleArchived(): void {
    const next = !this.archivedExpanded();
    this.archivedExpanded.set(next);
    localStorage.setItem(ARCHIVED_EXPANDED_KEY, String(next));
  }

  protected openNewGoal(): void {
    this.dialog.open(GoalModalComponent, { width: DIALOG_WIDTH, data: { mode: 'create' } });
  }

  protected openNewGroup(): void {
    this.dialog.open(GroupModalComponent, { width: DIALOG_WIDTH, data: { mode: 'create' } });
  }
}
