import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Goal, LogEntry } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

const PAGE_SIZE = 3;

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
  protected readonly faPrev = faChevronLeft;
  protected readonly faNext = faChevronRight;

  private readonly page = signal(0);

  protected readonly logs = computed<LogEntry[]>(() =>
    [...this.goal().logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  );

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.logs().length / PAGE_SIZE)));

  /** Clamped so deleting entries off the last page (or switching to a shorter-history goal)
   *  can't strand the view on a now-empty page. */
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedLogs = computed<LogEntry[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.logs().slice(start, start + PAGE_SIZE);
  });

  constructor() {
    // Jump back to page 1 when the goal itself changes (not on every log edit, which would
    // otherwise strand-then-reset a user paging through a goal they're actively logging to).
    effect(() => {
      this.goal().id;
      this.page.set(0);
    });
  }

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

  protected prevPage(): void {
    this.page.update(p => Math.max(0, p - 1));
  }

  protected nextPage(): void {
    this.page.update(p => Math.min(this.totalPages() - 1, p + 1));
  }
}
