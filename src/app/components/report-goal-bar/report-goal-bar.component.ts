import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Goal } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';

@Component({
  selector: 'app-report-goal-bar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './report-goal-bar.component.html',
  styleUrl: './report-goal-bar.component.css'
})
export class ReportGoalBarComponent {
  readonly goal = input.required<Goal>();

  protected readonly percent = computed(() => GoalsService.goalPercent(this.goal()));
  protected readonly completed = computed(() => GoalsService.totalAmount(this.goal()));
  /** Below this fill width there isn't room for readable dark text inside the bar. */
  protected readonly labelInside = computed(() => this.percent() >= 22);

  protected formatAmount = formatAmount;
}
