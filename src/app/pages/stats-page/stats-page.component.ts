import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GoalsService } from '../../services/goals.service';
import { GoalCardComponent } from '../../components/goal-card/goal-card.component';

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, GoalCardComponent],
  templateUrl: './stats-page.component.html',
  styleUrl: './stats-page.component.css'
})
export class StatsPageComponent {
  private readonly goalsService = inject(GoalsService);

  protected readonly generatedAt = new Date();

  protected readonly groups = this.goalsService.groups;
  protected readonly ungroupedGoals = computed(() => this.goalsService.ungroupedGoals());
  protected readonly hasAnything = computed(() => this.goalsService.goals().length > 0);

  protected readonly overallPercent = computed(() => GoalsService.groupPercent(this.goalsService.goals()));

  protected readonly goalsByGroup = computed(() => {
    const map = new Map<string, ReturnType<GoalsService['ungroupedGoals']>>();
    for (const group of this.groups()) {
      map.set(group.id, this.goalsService.goalsInGroup(group.id));
    }
    return map;
  });

  protected groupPercent(groupId: string): number {
    return GoalsService.groupPercent(this.goalsByGroup().get(groupId) ?? []);
  }
}
