import { Component, inject } from '@angular/core';
import { Goal } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  templateUrl: './goal-list.component.html',
  styleUrl: './goal-list.component.css'
})
export class GoalListComponent {
  protected readonly goalsService = inject(GoalsService);

  protected select(goal: Goal): void {
    this.goalsService.selectGoal(goal.id);
  }

  protected progressLabel(goal: Goal): string {
    return `${formatAmount(GoalsService.totalAmount(goal), goal.unit)} / ${formatAmount(goal.targetAmount, goal.unit)}`;
  }
}
