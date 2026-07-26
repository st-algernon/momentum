import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toBlob, toPng } from 'html-to-image';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartSimple } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, dateToISO, formatAmount, todayISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';
import { ScopePickerComponent, ReportScope } from '../../components/scope-picker/scope-picker.component';
import { ProgressRingComponent } from '../../components/progress-ring/progress-ring.component';
import { ReportGoalBarComponent } from '../../components/report-goal-bar/report-goal-bar.component';
import { TrendChartComponent, ChartRange } from '../../components/trend-chart/trend-chart.component';

export interface ReportTheme {
  id: string;
  name: string;
  gradient: string;
}

const REPORT_THEMES: ReportTheme[] = [
  { id: 'violet', name: 'Violet', gradient: 'linear-gradient(160deg, #3c2f80 0%, #5b5bd6 55%, #8c6ff7 100%)' },
  { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(160deg, #0f3d5c 0%, #1479b3 55%, #3fc1c9 100%)' },
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(160deg, #7a2048 0%, #c2417a 55%, #ff7e5f 100%)' },
  { id: 'forest', name: 'Forest', gradient: 'linear-gradient(160deg, #1e4620 0%, #2f8f46 55%, #7bc96f 100%)' },
  { id: 'berry', name: 'Berry', gradient: 'linear-gradient(160deg, #4a1259 0%, #8e2a9e 55%, #c04cd1 100%)' },
  { id: 'slate', name: 'Slate', gradient: 'linear-gradient(160deg, #232838 0%, #3d4560 55%, #5c6b8a 100%)' }
];

const PERIOD_OPTIONS = [7, 14, 30] as const;

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatMenuModule,
    MatTooltipModule,
    FaIconComponent,
    ScopePickerComponent,
    ProgressRingComponent,
    ReportGoalBarComponent,
    TrendChartComponent
  ],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css'
})
export class ReportsPageComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('reportCard') private reportCardRef!: ElementRef<HTMLElement>;

  protected readonly generatedAt = new Date();
  protected readonly faFooterIcon = faChartSimple;
  protected readonly busy = signal(false);

  protected readonly themes = REPORT_THEMES;
  protected readonly theme = signal<ReportTheme>(REPORT_THEMES[0]);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly periodDays = signal<ChartRange>('all');

  protected readonly scope = signal<ReportScope>(this.scopeFromQueryOrDefault());

  protected readonly singleGoal = computed<Goal | null>(() => {
    const scope = this.scope();
    return scope.type === 'goal' ? this.goalsService.goalById(scope.goalId) ?? null : null;
  });

  protected readonly scopedGoals = computed<Goal[]>(() => {
    const scope = this.scope();
    if (scope.type === 'goal') {
      const goal = this.singleGoal();
      return goal ? [goal] : [];
    }
    if (scope.type === 'group') {
      const group = this.goalsService.groupById(scope.groupId);
      return group ? this.goalsService.goalsInGroup(group.id) : this.goalsService.goals();
    }
    return this.goalsService.goals();
  });

  protected readonly scopeTitle = computed<string>(() => {
    const scope = this.scope();
    if (scope.type === 'group') return this.goalsService.groupById(scope.groupId)?.name ?? 'Nothing tracked yet';
    if (scope.type === 'goal') return this.singleGoal()?.name ?? 'Nothing tracked yet';
    return 'All goals';
  });

  protected readonly overallPercent = computed(() => GoalsService.groupPercent(this.scopedGoals()));

  protected readonly completedForGoal = computed(() => {
    const goal = this.singleGoal();
    return goal ? GoalsService.totalAmount(goal) : 0;
  });

  protected readonly remainingForGoal = computed(() => {
    const goal = this.singleGoal();
    return goal ? Math.max(0, goal.targetAmount - this.completedForGoal()) : 0;
  });

  protected readonly highestForGoal = computed(() => {
    const goal = this.singleGoal();
    return goal ? GoalsService.highestLoggedAmount(goal) : 0;
  });

  protected readonly isBestType = computed(() => this.singleGoal()?.goalType === 'best');
  protected readonly attemptsForGoal = computed(() => this.singleGoal()?.logs.length ?? 0);

  protected readonly averageForGoal = computed(() => {
    const goal = this.singleGoal();
    return goal ? GoalsService.dailyAverageOverDays(goal, this.periodDays()) : 0;
  });

  /** Amount logged within the selected recent window, for the single-goal view. Meaningless for
   *  "all time" (that's just everything), so the delta highlight/caption stay hidden for it.
   *  For 'best' goals this is the improvement over the pre-window best, not a sum of attempts —
   *  summing reps from separate attempts wouldn't mean anything. */
  protected readonly periodAmountForGoal = computed(() => {
    const goal = this.singleGoal();
    const period = this.periodDays();
    if (!goal || period === 'all') return 0;
    const start = this.periodStartISO(period);
    const recentLogs = goal.logs.filter(log => log.date >= start);

    if (goal.goalType === 'best') {
      const priorLogs = goal.logs.filter(log => log.date < start);
      const recentBest = GoalsService.amountForLogs('best', recentLogs);
      const priorBest = GoalsService.amountForLogs('best', priorLogs);
      return Math.max(0, recentBest - priorBest);
    }

    return GoalsService.amountForLogs('cumulative', recentLogs);
  });

  /** Percent of target reached before the recent window started — the rest of the fill up to
   *  overallPercent() is highlighted separately to show "how much closer" the recent window got you. */
  protected readonly priorPercentForGoal = computed(() => {
    const goal = this.singleGoal();
    if (!goal || !goal.targetAmount) return 0;
    const prior = Math.max(0, this.completedForGoal() - this.periodAmountForGoal());
    return Math.min(100, (prior / goal.targetAmount) * 100);
  });

  protected formatAmount = formatAmount;

  protected setPeriod(period: ChartRange): void {
    this.periodDays.set(period);
  }

  protected periodLabel(): string {
    const period = this.periodDays();
    return period === 'all' ? 'All time' : `Last ${period} days`;
  }

  protected async downloadImage(): Promise<void> {
    this.busy.set(true);
    try {
      const dataUrl = await toPng(this.reportCardRef.nativeElement, { pixelRatio: 2 });
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `momentum-report-${todayISO()}.png`;
      anchor.click();
    } catch {
      this.toast.error('Could not generate the image.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async shareImage(): Promise<void> {
    this.busy.set(true);
    try {
      const blob = await toBlob(this.reportCardRef.nativeElement, { pixelRatio: 2 });
      if (!blob) throw new Error('Could not render image.');

      const file = new File([blob], `momentum-report-${todayISO()}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Momentum progress report' });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
        this.toast.show("Sharing isn't supported here — downloaded instead.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.toast.error('Could not share the image.');
    } finally {
      this.busy.set(false);
    }
  }

  private periodStartISO(days: number): string {
    const d = new Date(`${todayISO()}T12:00:00`);
    d.setDate(d.getDate() - (days - 1));
    return dateToISO(d);
  }

  /** Seeded once from a ?goal= link (e.g. the completion dialog's "View report" action) —
   *  not kept in sync with the URL afterward, this is one-way seeding only. */
  private scopeFromQueryOrDefault(): ReportScope {
    const goalId = this.route.snapshot.queryParamMap.get('goal');
    if (goalId && this.goalsService.goalById(goalId)) {
      return { type: 'goal', goalId };
    }
    return this.defaultScope();
  }

  /** Prefers an active group so opening Reports doesn't land on archived history by default;
   *  falls back to archived content rather than a bare "all goals" view when that's all there is. */
  private defaultScope(): ReportScope {
    const activeGroups = this.goalsService.activeGroups();
    if (activeGroups.length) return { type: 'group', groupId: activeGroups[0].id };
    const ungrouped = this.goalsService.ungroupedGoals();
    if (ungrouped.length) return { type: 'goal', goalId: ungrouped[0].id };
    const archivedGroups = this.goalsService.archivedGroups();
    if (archivedGroups.length) return { type: 'group', groupId: archivedGroups[0].id };
    return { type: 'all' };
  }
}
