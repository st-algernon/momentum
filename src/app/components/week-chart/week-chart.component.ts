import { Component, computed, inject } from '@angular/core';
import { GoalsService, formatAmount, todayISO } from '../../services/goals.service';

interface DayBar {
  date: string;
  label: string;
  amount: number;
  heightPercent: number;
}

@Component({
  selector: 'app-week-chart',
  standalone: true,
  templateUrl: './week-chart.component.html',
  styleUrl: './week-chart.component.css'
})
export class WeekChartComponent {
  private readonly goalsService = inject(GoalsService);

  protected readonly unit = computed(() => this.goalsService.activeGoal()?.unit ?? 'hours');

  protected readonly days = computed<DayBar[]>(() => {
    const goal = this.goalsService.activeGoal();
    const totals: Record<string, number> = {};
    goal?.logs.forEach(log => {
      totals[log.date] = (totals[log.date] || 0) + Number(log.amount);
    });

    const raw = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(`${todayISO()}T12:00:00`);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      raw.push({
        date: iso,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
        amount: totals[iso] || 0
      });
    }

    const maxAmount = Math.max(1, ...raw.map(day => day.amount));
    return raw.map(day => ({ ...day, heightPercent: Math.max(7, (day.amount / maxAmount) * 100) }));
  });

  protected readonly weekSummary = computed<string>(() => {
    const weekTotal = this.days().reduce((sum, day) => sum + day.amount, 0);
    return weekTotal
      ? `${formatAmount(weekTotal, this.unit())} logged during the last 7 days.`
      : 'No progress logged in the last 7 days.';
  });

  protected barTitle(day: DayBar): string {
    return `${day.date}: ${formatAmount(day.amount, this.unit())}`;
  }
}
