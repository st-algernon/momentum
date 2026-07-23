import { Component, computed, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Goal, LogEntry } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-history-list',
  standalone: true,
  imports: [MatTooltipModule, FaIconComponent],
  templateUrl: './history-list.component.html',
  styleUrl: './history-list.component.css'
})
export class HistoryListComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  readonly goal = input.required<Goal>();

  protected readonly faTrash = faTrashCan;

  protected readonly logs = computed<LogEntry[]>(() =>
    [...this.goal().logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 12)
  );

  protected formatAmount = formatAmount;

  protected formatDateTime(log: LogEntry): string {
    const date = new Date(`${log.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = new Date(log.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date}, ${time}`;
  }

  protected removeLog(log: LogEntry): void {
    this.goalsService.deleteLog(this.goal().id, log.id);
    this.toast.show('Entry deleted');
  }
}
