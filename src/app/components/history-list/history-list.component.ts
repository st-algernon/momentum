import { Component, computed, inject } from '@angular/core';
import { LogEntry } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-history-list',
  standalone: true,
  templateUrl: './history-list.component.html',
  styleUrl: './history-list.component.css'
})
export class HistoryListComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  protected readonly unit = computed(() => this.goalsService.activeGoal()?.unit ?? 'hours');

  protected readonly logs = computed<LogEntry[]>(() => {
    const goal = this.goalsService.activeGoal();
    if (!goal) return [];
    return [...goal.logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 12);
  });

  protected formatAmount = formatAmount;

  protected formatDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  protected removeLog(log: LogEntry): void {
    const group = this.goalsService.activeGroup();
    const goal = this.goalsService.activeGoal();
    if (!group || !goal) return;
    this.goalsService.deleteLog(group.id, goal.id, log.id);
    this.toast.show('Entry deleted');
  }
}
