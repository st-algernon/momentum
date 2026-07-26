import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faMedal, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { Goal } from '../../models/goal.model';
import { GoalsService, formatAmount } from '../../services/goals.service';

export interface Achievement {
  goal: Goal;
  startDate: string;
  completedOn: string;
  durationDays: number;
  amount: number;
  logCount: number;
  deadlineDeltaDays: number | null;
  /** Year label to print above this row, or null to keep it under the previous row's year. */
  showYear: string | null;
  isLatest: boolean;
  isFirstWin: boolean;
}

@Component({
  selector: 'app-achievements-page',
  standalone: true,
  imports: [DatePipe, RouterLink, FaIconComponent],
  templateUrl: './achievements-page.component.html',
  styleUrl: './achievements-page.component.css'
})
export class AchievementsPageComponent {
  private readonly goalsService = inject(GoalsService);

  protected formatAmount = formatAmount;

  protected readonly achievements = computed<Achievement[]>(() => {
    const achieved = this.goalsService
      .goals()
      .map(goal => ({ goal, completedOn: GoalsService.completedOn(goal) }))
      .filter((entry): entry is { goal: Goal; completedOn: string } => entry.completedOn !== null);

    achieved.sort((a, b) => {
      if (a.completedOn !== b.completedOn) return a.completedOn < b.completedOn ? 1 : -1;
      return GoalsService.lastActivityAt([b.goal]) - GoalsService.lastActivityAt([a.goal]);
    });

    const years = new Set(achieved.map(entry => entry.completedOn.slice(0, 4)));
    const spansMultipleYears = years.size > 1;
    let lastYear: string | null = null;

    return achieved.map(({ goal, completedOn }, index) => {
      const startDate = GoalsService.firstLogDate(goal) ?? completedOn;
      const year = completedOn.slice(0, 4);
      const showYear = spansMultipleYears && year !== lastYear ? year : null;
      lastYear = year;

      return {
        goal,
        startDate,
        completedOn,
        durationDays: GoalsService.daysBetween(startDate, completedOn),
        amount: GoalsService.totalAmount(goal),
        logCount: goal.logs.length,
        deadlineDeltaDays: GoalsService.deadlineDeltaDays(goal, completedOn),
        showYear,
        isLatest: achieved.length > 1 && index === 0,
        isFirstWin: index === achieved.length - 1
      };
    });
  });

  protected icon(achievement: Achievement): IconDefinition {
    return achievement.goal.goalType === 'best' ? faMedal : faTrophy;
  }

  /** Caps the stagger so a long list finishes animating in well under a second. */
  protected animationStep(index: number): number {
    return Math.min(index, 8);
  }
}
