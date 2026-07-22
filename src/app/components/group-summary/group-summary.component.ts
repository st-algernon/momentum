import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoalsService } from '../../services/goals.service';

@Component({
  selector: 'app-group-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './group-summary.component.html',
  styleUrl: './group-summary.component.css'
})
export class GroupSummaryComponent {
  private readonly goalsService = inject(GoalsService);

  protected readonly group = this.goalsService.activeGroup;

  protected readonly percent = computed(() => {
    const group = this.group();
    return group ? GoalsService.groupPercent(group) : 0;
  });
}
