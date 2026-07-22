import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoalsService, formatHours } from '../../services/goals.service';
import { LogFormComponent } from '../log-form/log-form.component';
import { HistoryListComponent } from '../history-list/history-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, LogFormComponent, HistoryListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly goalsService = inject(GoalsService);

  protected readonly goal = this.goalsService.activeGoal;

  protected readonly completed = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.totalHours(goal) : 0;
  });

  protected readonly remaining = computed(() => {
    const goal = this.goal();
    return goal ? Math.max(0, goal.targetHours - this.completed()) : 0;
  });

  protected readonly percent = computed(() => {
    const goal = this.goal();
    return goal ? Math.min(100, (this.completed() / goal.targetHours) * 100) : 0;
  });

  protected readonly streak = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.currentStreak(goal) : 0;
  });

  protected readonly average = computed(() => {
    const goal = this.goal();
    return goal ? GoalsService.dailyAverage(goal) : 0;
  });

  protected formatHours = formatHours;
}
