import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoalGroup } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.css'
})
export class GroupListComponent {
  protected readonly goalsService = inject(GoalsService);

  protected select(group: GoalGroup): void {
    this.goalsService.selectGroup(group.id);
  }

  protected percent(group: GoalGroup): number {
    return GoalsService.groupPercent(group);
  }
}
