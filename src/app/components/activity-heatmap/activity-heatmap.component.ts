import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Goal } from '../../models/goal.model';
import { GoalsService, dateToISO, formatAmount, todayISO } from '../../services/goals.service';

/** Always show at least ~3 months so a short or brand-new goal still gets real context,
 *  capped at half a year to keep cells legible in the sidebar. */
const MIN_WEEKS = 14;
const MAX_WEEKS = 26;
/** Shades above "nothing logged", mirroring the four GitHub uses. */
const LEVELS = 4;

interface HeatCell {
  key: string;
  /** Null for padding days that fall outside the goal's own window — rendered blank. */
  date: string | null;
  amount: number;
  level: number;
  isCompletion: boolean;
  tooltip: string;
}

interface MonthLabel {
  key: string;
  label: string;
  column: number;
}

@Component({
  selector: 'app-activity-heatmap',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './activity-heatmap.component.html',
  styleUrl: './activity-heatmap.component.css',
  host: {
    '[class.is-complete]': 'isComplete()'
  }
})
export class ActivityHeatmapComponent {
  readonly goal = input.required<Goal>();

  protected readonly isComplete = computed(() => GoalsService.isGoalComplete(this.goal()));
  protected readonly completedOn = computed(() => GoalsService.completedOn(this.goal()));

  private readonly perDay = computed(() => GoalsService.perDayAmounts(this.goal()));

  /** An achieved goal's story ends with its last entry; an active one runs to today, so
   *  a recent gap reads as the real "you haven't logged in a while" that it is. */
  private readonly endISO = computed(() => {
    if (!this.isComplete()) return todayISO();
    const dates = Object.keys(this.perDay());
    return dates.length ? dates.reduce((max, date) => (date > max ? date : max)) : todayISO();
  });

  /** Sunday of the final column's week. The grid is built backwards from here so the
   *  week count is exact — snapping a clamped start date forward to a Sunday instead
   *  could quietly add a 27th column. */
  private readonly lastSundayISO = computed(() => this.sundayOf(this.endISO()));

  protected readonly weeks = computed(() => {
    const dates = Object.keys(this.perDay());
    if (!dates.length) return MIN_WEEKS;

    const firstLog = dates.reduce((min, date) => (date < min ? date : min));
    const spanWeeks = Math.floor(this.daysBetween(this.sundayOf(firstLog), this.lastSundayISO()) / 7) + 1;
    return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, spanWeeks));
  });

  private readonly gridStartISO = computed(() => this.shiftDays(this.lastSundayISO(), -((this.weeks() - 1) * 7)));

  private readonly maxAmount = computed(() => Math.max(0, ...Object.values(this.perDay())));

  protected readonly cells = computed<HeatCell[]>(() => {
    const goal = this.goal();
    const perDay = this.perDay();
    const windowEnd = this.endISO();
    const completion = this.completedOn();
    const max = this.maxAmount();

    const result: HeatCell[] = [];
    const cursor = new Date(`${this.gridStartISO()}T12:00:00`);

    // Column-major: the grid flows down each week (Sun→Sat) before moving right.
    for (let week = 0; week < this.weeks(); week++) {
      for (let day = 0; day < 7; day++) {
        const iso = dateToISO(cursor);
        // Only days past the window end stay blank, so the grid keeps a clean edge
        // instead of going ragged before the goal's first entry.
        const inWindow = iso <= windowEnd;
        const amount = inWindow ? perDay[iso] ?? 0 : 0;
        const isCompletion = inWindow && iso === completion;

        result.push({
          key: iso,
          date: inWindow ? iso : null,
          amount,
          level: this.levelFor(amount, max),
          isCompletion,
          tooltip: inWindow ? this.tooltipFor(iso, amount, isCompletion, goal.unit) : ''
        });

        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return result;
  });

  protected readonly monthLabels = computed<MonthLabel[]>(() => {
    const labels: MonthLabel[] = [];
    const cursor = new Date(`${this.gridStartISO()}T12:00:00`);
    let lastMonth = -1;
    let lastLabelledColumn = -99;

    for (let week = 0; week < this.weeks(); week++) {
      const month = cursor.getMonth();
      // Skip labels that would collide with the previous one on a narrow grid.
      if (month !== lastMonth && week - lastLabelledColumn >= 3) {
        labels.push({
          key: `${cursor.getFullYear()}-${month}`,
          label: cursor.toLocaleDateString(undefined, { month: 'short' }),
          column: week + 1
        });
        lastLabelledColumn = week;
      }
      lastMonth = month;
      cursor.setDate(cursor.getDate() + 7);
    }
    return labels;
  });

  protected readonly activeDays = computed(() => this.cells().filter(cell => cell.amount > 0).length);

  protected readonly levelSwatches = [0, 1, 2, 3, 4];

  /** Labelled every other row to keep the gutter uncluttered. Rows run Sun→Sat, so these
   *  land on rows 2, 4 and 6 — see the grid-row placement in the stylesheet. */
  protected readonly weekdayLabels = ['Mon', 'Wed', 'Fri'];

  private levelFor(amount: number, max: number): number {
    if (amount <= 0 || max <= 0) return 0;
    return Math.min(LEVELS, Math.ceil((amount / max) * LEVELS));
  }

  private tooltipFor(iso: string, amount: number, isCompletion: boolean, unit: string): string {
    const label = new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const activity = amount > 0 ? formatAmount(amount, unit) : 'nothing logged';
    return isCompletion ? `${label} — ${activity} · goal achieved` : `${label} — ${activity}`;
  }

  /** Sunday of the week containing the given date — weeks run Sun→Sat down each column.
   *  getDay() is already 0-indexed from Sunday, so it doubles as the row offset. */
  private sundayOf(iso: string): string {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() - date.getDay());
    return dateToISO(date);
  }

  private shiftDays(iso: string, days: number): string {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + days);
    return dateToISO(date);
  }

  private daysBetween(fromISO: string, toISO: string): number {
    const from = new Date(`${fromISO}T12:00:00`);
    const to = new Date(`${toISO}T12:00:00`);
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
  }
}
