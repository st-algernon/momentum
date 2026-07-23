import { Injectable, effect, signal } from '@angular/core';
import { AppState, Goal, GoalGroup, LogEntry } from '../models/goal.model';

const STORAGE_KEY = 'momentum-data-v3';
const V2_STORAGE_KEY = 'skilltrack-data-v2';
const V1_STORAGE_KEY = 'skilltrack-data-v1';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dateToISO(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return dateToISO(new Date());
}

export function formatAmount(value: number, unit: string): string {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return unit === 'hours' ? `${rounded}h` : `${rounded} ${unit}`;
}

/** Units a goal can be measured in. Pick-only in the UI — no custom values. */
export const UNIT_OPTIONS = ['hours', 'minutes', 'days', 'times', 'km'] as const;

/** Units that accept fractional amounts; everything else logs whole numbers. */
const DECIMAL_UNITS = new Set(['hours', 'km']);

export function amountStepFor(unit: string): number {
  return DECIMAL_UNITS.has(unit) ? 0.1 : 1;
}

interface V2Goal {
  id: string;
  name: string;
  targetAmount: number;
  unit: string;
  deadline: string | null;
  logs: LogEntry[];
  createdAt: number;
}

interface V2State {
  groups: { id: string; name: string; goals: V2Goal[]; createdAt: number }[];
}

interface V1Goal {
  id: string;
  name: string;
  targetHours: number;
  deadline: string | null;
  logs: { id: string; date: string; hours: number; note: string; createdAt: number }[];
  createdAt: number;
}

interface V1State {
  goals: V1Goal[];
}

function flattenV2(state: V2State): AppState {
  const groups: GoalGroup[] = state.groups.map(group => ({
    id: group.id,
    name: group.name,
    createdAt: group.createdAt
  }));
  const goals: Goal[] = state.groups.flatMap(group =>
    group.goals.map(goal => ({ ...goal, groupId: group.id }))
  );
  return { groups, goals };
}

function migrateV1(legacy: V1State): AppState {
  if (!legacy.goals.length) return { groups: [], goals: [] };

  const group: GoalGroup = { id: uid(), name: 'My Goals', createdAt: Date.now() };
  const goals: Goal[] = legacy.goals.map(goal => ({
    id: goal.id,
    groupId: group.id,
    name: goal.name,
    targetAmount: goal.targetHours,
    unit: 'hours',
    deadline: goal.deadline,
    createdAt: goal.createdAt,
    logs: goal.logs.map(log => ({
      id: log.id,
      date: log.date,
      amount: log.hours,
      note: log.note,
      createdAt: log.createdAt
    }))
  }));

  return { groups: [group], goals };
}

function loadState(): AppState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.groups) && Array.isArray(saved.goals)) return saved;
  } catch (error) {
    console.warn('Could not read saved data.', error);
  }

  try {
    const v2 = JSON.parse(localStorage.getItem(V2_STORAGE_KEY) ?? 'null');
    if (v2 && Array.isArray(v2.groups)) return flattenV2(v2);
  } catch (error) {
    console.warn('Could not read v2 data.', error);
  }

  try {
    const v1 = JSON.parse(localStorage.getItem(V1_STORAGE_KEY) ?? 'null');
    if (v1 && Array.isArray(v1.goals)) return migrateV1(v1);
  } catch (error) {
    console.warn('Could not read legacy data.', error);
  }

  return { groups: [], goals: [] };
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly initial = loadState();

  readonly groups = signal<GoalGroup[]>(this.initial.groups);
  readonly goals = signal<Goal[]>(this.initial.goals);

  constructor() {
    effect(() => {
      const state: AppState = { groups: this.groups(), goals: this.goals() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  goalById(id: string | null | undefined): Goal | undefined {
    if (!id) return undefined;
    return this.goals().find(goal => goal.id === id);
  }

  groupById(id: string | null | undefined): GoalGroup | undefined {
    if (!id) return undefined;
    return this.groups().find(group => group.id === id);
  }

  ungroupedGoals(): Goal[] {
    return this.goals().filter(goal => !goal.groupId);
  }

  goalsInGroup(groupId: string): Goal[] {
    return this.goals().filter(goal => goal.groupId === groupId);
  }

  createGroup(name: string): GoalGroup {
    const group: GoalGroup = { id: uid(), name, createdAt: Date.now() };
    this.groups.update(groups => [group, ...groups]);
    return group;
  }

  renameGroup(id: string, name: string): void {
    this.groups.update(groups => groups.map(group => (group.id === id ? { ...group, name } : group)));
  }

  deleteGroup(id: string): void {
    this.groups.update(groups => groups.filter(group => group.id !== id));
    this.goals.update(goals => goals.filter(goal => goal.groupId !== id));
  }

  createGoal(name: string, targetAmount: number, unit: string, deadline: string | null, groupId: string | null): Goal {
    const goal: Goal = {
      id: uid(),
      groupId,
      name,
      targetAmount,
      unit: unit.trim().toLowerCase() || 'hours',
      deadline,
      logs: [],
      createdAt: Date.now()
    };
    this.goals.update(goals => [goal, ...goals]);
    return goal;
  }

  updateGoal(
    id: string,
    patch: Partial<Pick<Goal, 'name' | 'targetAmount' | 'unit' | 'deadline' | 'groupId'>>
  ): void {
    this.goals.update(goals =>
      goals.map(goal =>
        goal.id === id
          ? { ...goal, ...patch, unit: (patch.unit ?? goal.unit).trim().toLowerCase() || 'hours' }
          : goal
      )
    );
  }

  moveGoalToGroup(id: string, groupId: string | null): void {
    this.goals.update(goals => goals.map(goal => (goal.id === id ? { ...goal, groupId } : goal)));
  }

  deleteGoal(id: string): void {
    this.goals.update(goals => goals.filter(goal => goal.id !== id));
  }

  addLog(goalId: string, date: string, amount: number, note: string): void {
    const entry: LogEntry = { id: uid(), date, amount, note: note.trim(), createdAt: Date.now() };
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
    this.groups.set(state.groups);
    this.goals.set(state.goals);
  }

  exportState(): AppState {
    return { groups: this.groups(), goals: this.goals() };
  }

  static totalAmount(goal: Goal): number {
    return goal.logs.reduce((sum, log) => sum + Number(log.amount), 0);
  }

  static goalPercent(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min(100, (GoalsService.totalAmount(goal) / goal.targetAmount) * 100);
  }

  static groupPercent(goals: Goal[]): number {
    if (!goals.length) return 0;
    const total = goals.reduce((sum, goal) => sum + GoalsService.goalPercent(goal), 0);
    return total / goals.length;
  }

  /** Timestamp of the most recently added log across the given goals, or 0 if none. */
  static lastActivityAt(goals: Goal[]): number {
    let latest = 0;
    for (const goal of goals) {
      for (const log of goal.logs) {
        if (log.createdAt > latest) latest = log.createdAt;
      }
    }
    return latest;
  }

  static currentStreak(goal: Goal): number {
    const loggedDates = new Set(goal.logs.filter(log => Number(log.amount) > 0).map(log => log.date));
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
      totals[log.date] = (totals[log.date] || 0) + Number(log.amount);
    });
    const values = Object.values(totals);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
