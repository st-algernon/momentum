import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, Goal, LogEntry } from '../models/goal.model';

const STORAGE_KEY = 'skilltrack-data-v1';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function formatHours(value: number): string {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return `${rounded}h`;
}

function loadState(): AppState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.goals)) return saved;
  } catch (error) {
    console.warn('Could not read saved data.', error);
  }
  return { goals: [], activeGoalId: null };
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly initial = loadState();

  readonly goals = signal<Goal[]>(this.initial.goals);
  readonly activeGoalId = signal<string | null>(this.initial.activeGoalId);

  readonly activeGoal = computed<Goal | null>(() => {
    const goals = this.goals();
    return goals.find(goal => goal.id === this.activeGoalId()) ?? goals[0] ?? null;
  });

  constructor() {
    effect(() => {
      const state: AppState = { goals: this.goals(), activeGoalId: this.activeGoalId() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });

    effect(() => {
      const goals = this.goals();
      const activeId = this.activeGoalId();
      if (goals.length && !goals.some(goal => goal.id === activeId)) {
        this.activeGoalId.set(goals[0].id);
      }
    });
  }

  selectGoal(id: string): void {
    this.activeGoalId.set(id);
  }

  createGoal(name: string, targetHours: number, deadline: string | null): void {
    const goal: Goal = {
      id: uid(),
      name,
      targetHours,
      deadline,
      logs: [],
      createdAt: Date.now()
    };
    this.goals.update(goals => [goal, ...goals]);
    this.activeGoalId.set(goal.id);
  }

  deleteGoal(id: string): void {
    this.goals.update(goals => goals.filter(goal => goal.id !== id));
    if (this.activeGoalId() === id) {
      this.activeGoalId.set(this.goals()[0]?.id ?? null);
    }
  }

  addLog(goalId: string, date: string, hours: number, note: string): void {
    const entry: LogEntry = { id: uid(), date, hours, note: note.trim(), createdAt: Date.now() };
    this.goals.update(goals =>
      goals.map(goal => (goal.id === goalId ? { ...goal, logs: [...goal.logs, entry] } : goal))
    );
  }

  deleteLog(goalId: string, logId: string): void {
    this.goals.update(goals =>
      goals.map(goal =>
        goal.id === goalId ? { ...goal, logs: goal.logs.filter(log => log.id !== logId) } : goal
      )
    );
  }

  importState(state: AppState): void {
    this.goals.set(state.goals);
    this.activeGoalId.set(state.activeGoalId ?? state.goals[0]?.id ?? null);
  }

  exportState(): AppState {
    return { goals: this.goals(), activeGoalId: this.activeGoalId() };
  }

  static totalHours(goal: Goal): number {
    return goal.logs.reduce((sum, log) => sum + Number(log.hours), 0);
  }

  static currentStreak(goal: Goal): number {
    const loggedDates = new Set(goal.logs.filter(log => Number(log.hours) > 0).map(log => log.date));
    let streak = 0;
    const cursor = new Date(`${todayISO()}T12:00:00`);
    while (loggedDates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  static dailyAverage(goal: Goal): number {
    if (!goal.logs.length) return 0;
    const totals: Record<string, number> = {};
    goal.logs.forEach(log => {
      totals[log.date] = (totals[log.date] || 0) + Number(log.hours);
    });
    const values = Object.values(totals);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
