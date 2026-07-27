import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Goal } from '../../models/goal.model';
import { GoalsService, dateToISO, formatAmount, todayISO } from '../../services/goals.service';

export type ChartRange = number | 'all';

interface ChartPoint {
  key: string;
  label: string;
  amount: number;
  heightPercent: number;
}

const MS_PER_DAY = 86400000;
/** Up to a week renders as readable columns; anything longer becomes a line. */
const MAX_BAR_DAYS = 7;
/** Past this span, daily points get bucketed so the line stays legible. */
const MAX_DAILY_POINTS = 45;
const MAX_WEEKLY_POINTS = 18;

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './trend-chart.component.html',
  styleUrl: './trend-chart.component.css',
  host: {
    '[class.trend-chart-report]': "variant() === 'report'"
  }
})
export class TrendChartComponent {
  readonly goal = input.required<Goal>();
  readonly variant = input<'default' | 'report'>('default');
  readonly range = input<ChartRange>('all');

  protected readonly average = computed(() => GoalsService.dailyAverageOverDays(this.goal(), this.range()));

  /** An achieved goal's story ends with its last entry, not today — charting on to the
   *  present would draw a flat, empty tail past the point where the goal was actually
   *  won. An active goal still runs to today so a recent gap reads as a real gap. */
  private readonly endISO = computed(() => {
    const goal = this.goal();
    if (!GoalsService.isGoalComplete(goal)) return todayISO();
    return GoalsService.lastLogDate(goal) ?? todayISO();
  });

  private readonly startISO = computed(() => {
    const range = this.range();
    const end = this.endISO();
    if (range === 'all') {
      const dates = this.goal().logs.map(log => log.date);
      return dates.length ? dates.reduce((min, date) => (date < min ? date : min)) : end;
    }
    const cursor = new Date(`${end}T12:00:00`);
    cursor.setDate(cursor.getDate() - (range - 1));
    return dateToISO(cursor);
  });

  private readonly totalDays = computed(() => {
    const start = new Date(`${this.startISO()}T12:00:00`);
    const end = new Date(`${this.endISO()}T12:00:00`);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  });

  protected readonly chartMode = computed<'bar' | 'line'>(() =>
    this.totalDays() <= MAX_BAR_DAYS ? 'bar' : 'line'
  );

  /** Days per plotted point: 1 for short spans, then weekly, then monthly. */
  private readonly bucketDays = computed(() => {
    const days = this.totalDays();
    if (days <= MAX_DAILY_POINTS) return 1;
    if (days <= MAX_WEEKLY_POINTS * 7) return 7;
    return 30;
  });

  private readonly rawPoints = computed<{ key: string; label: string; amount: number }[]>(() => {
    const goal = this.goal();
    const perDay = GoalsService.perDayAmounts(goal);

    const bucketDays = this.bucketDays();
    const useWeekdayLabels = this.chartMode() === 'bar';

    const points: { key: string; label: string; amount: number }[] = [];
    const cursor = new Date(`${this.startISO()}T12:00:00`);
    const end = new Date(`${this.endISO()}T12:00:00`);

    while (cursor <= end) {
      const bucketStart = new Date(cursor);
      const bucketValues: number[] = [];
      for (let i = 0; i < bucketDays && cursor <= end; i++) {
        bucketValues.push(perDay[dateToISO(cursor)] || 0);
        cursor.setDate(cursor.getDate() + 1);
      }
      const amount = GoalsService.aggregateAmounts(goal.goalType, bucketValues);

      let label: string;
      if (useWeekdayLabels) {
        label = bucketStart.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
      } else if (bucketDays === 30) {
        label = bucketStart.toLocaleDateString(undefined, { month: 'short' });
      } else {
        label = bucketStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }

      points.push({ key: dateToISO(bucketStart), label, amount });
    }
    return points;
  });

  private readonly maxAmount = computed(() => Math.max(1, this.average(), ...this.rawPoints().map(p => p.amount)));

  protected readonly points = computed<ChartPoint[]>(() =>
    this.rawPoints().map(p => ({ ...p, heightPercent: Math.max(0, (p.amount / this.maxAmount()) * 100) }))
  );

  /** Bars get a visible stub for zero days; the line plots true zeroes. */
  protected barHeight(point: ChartPoint): number {
    return Math.max(point.amount > 0 ? 7 : 3, point.heightPercent);
  }

  /** A label under every point is unreadable past a handful, so thin them to ~5 evenly spaced. */
  protected readonly axisLabels = computed<{ key: string; label: string }[]>(() => {
    const points = this.points();
    if (points.length <= 6) return points.map(p => ({ key: p.key, label: p.label }));

    const wanted = 5;
    const step = (points.length - 1) / (wanted - 1);
    const picked: { key: string; label: string }[] = [];
    for (let i = 0; i < wanted; i++) {
      const p = points[Math.round(i * step)];
      picked.push({ key: p.key, label: p.label });
    }
    return picked;
  });

  protected readonly averageLinePercent = computed(() => Math.min(100, (this.average() / this.maxAmount()) * 100));

  /** Y scale: 0 / mid / top, so bar and line heights can actually be read as values. */
  protected readonly yTicks = computed<{ percent: number; label: string }[]>(() => {
    const max = this.maxAmount();
    return [0, 0.5, 1].map(fraction => ({
      percent: fraction * 100,
      label: this.formatTick(max * fraction)
    }));
  });

  /** Says what one plotted point represents, e.g. "hours per day" or, for 'best' goals,
   *  "best times per day" since each point is the top attempt rather than a total. */
  protected readonly yAxisCaption = computed(() => {
    const goal = this.goal();
    const per = this.bucketDays() === 30 ? 'month' : this.bucketDays() === 7 ? 'week' : 'day';
    const prefix = goal.goalType === 'best' ? 'best ' : '';
    return `${prefix}${goal.unit} per ${per}`;
  });

  private formatTick(value: number): string {
    if (value === 0) return '0';
    if (value >= 100) return String(Math.round(value));
    return String(Math.round(value * 10) / 10);
  }

  protected readonly chartTitle = computed(() => {
    const range = this.range();
    return range === 'all' ? 'All time' : `Last ${range} days`;
  });

  protected formatAmount = formatAmount;

  protected pointTitle(point: ChartPoint): string {
    return `${point.key}: ${formatAmount(point.amount, this.goal().unit)}`;
  }

  protected linePoints(): string {
    return this.svgCoords()
      .map(([x, y]) => `${x},${y}`)
      .join(' ');
  }

  protected areaPoints(): string {
    const coords = this.svgCoords();
    if (!coords.length) return '';
    const [firstX] = coords[0];
    const [lastX] = coords[coords.length - 1];
    const top = coords.map(([x, y]) => `${x},${y}`).join(' ');
    return `${firstX},100 ${top} ${lastX},100`;
  }

  private svgCoords(): [number, number][] {
    const points = this.points();
    if (!points.length) return [];
    if (points.length === 1) return [[150, 100 - points[0].heightPercent]];
    const step = 300 / (points.length - 1);
    return points.map((p, i) => [i * step, 100 - p.heightPercent] as [number, number]);
  }
}
