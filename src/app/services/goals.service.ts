import { Injectable, effect, signal } from '@angular/core';
import { AppState, Goal, GoalGroup, GoalType, LogEntry } from '../models/goal.model';

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
    description: '',
    archivedAt: null,
    createdAt: group.createdAt
  }));
  const goals: Goal[] = state.groups.flatMap(group =>
    group.goals.map(goal => ({ ...goal, description: '', groupId: group.id, goalType: 'cumulative' as const }))
  );
  return { groups, goals };
}

function migrateV1(legacy: V1State): AppState {
  if (!legacy.goals.length) return { groups: [], goals: [] };

  const group: GoalGroup = { id: uid(), name: 'My Goals', description: '', archivedAt: null, createdAt: Date.now() };
  const goals: Goal[] = legacy.goals.map(goal => ({
    id: goal.id,
    groupId: group.id,
    name: goal.name,
    description: '',
    targetAmount: goal.targetHours,
    unit: 'hours',
    goalType: 'cumulative',
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

/** Backfills fields added after data may already exist in storage (goalType, archivedAt),
 *  so older saved states and Gist restores keep working without a storage-key bump. */
function normalizeState(state: AppState): AppState {
  return {
    groups: state.groups.map(group => ({ ...group, archivedAt: group.archivedAt ?? null })),
    goals: state.goals.map(goal => ({ ...goal, goalType: goal.goalType ?? 'cumulative' }))
  };
}

function loadState(): AppState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.groups) && Array.isArray(saved.goals)) return normalizeState(saved);
  } catch (error) {
    console.warn('Could not read saved data.', error);
  }

  try {
    const v2 = JSON.parse(localStorage.getItem(V2_STORAGE_KEY) ?? 'null');
    if (v2 && Array.isArray(v2.groups)) return normalizeState(flattenV2(v2));
  } catch (error) {
    console.warn('Could not read v2 data.', error);
  }

  try {
    const v1 = JSON.parse(localStorage.getItem(V1_STORAGE_KEY) ?? 'null');
    if (v1 && Array.isArray(v1.goals)) return normalizeState(migrateV1(v1));
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

  createGroup(name: string, description = ''): GoalGroup {
    const group: GoalGroup = { id: uid(), name, description, archivedAt: null, createdAt: Date.now() };
    this.groups.update(groups => [group, ...groups]);
    return group;
  }

  updateGroup(id: string, patch: Partial<Pick<GoalGroup, 'name' | 'description'>>): void {
    this.groups.update(groups => groups.map(group => (group.id === id ? { ...group, ...patch } : group)));
  }

  deleteGroup(id: string): void {
    this.groups.update(groups => groups.filter(group => group.id !== id));
    this.goals.update(goals => goals.filter(goal => goal.groupId !== id));
  }

  archiveGroup(id: string): void {
    this.groups.update(groups => groups.map(group => (group.id === id ? { ...group, archivedAt: Date.now() } : group)));
  }

  unarchiveGroup(id: string): void {
    this.groups.update(groups => groups.map(group => (group.id === id ? { ...group, archivedAt: null } : group)));
  }

  activeGroups(): GoalGroup[] {
    return this.groups().filter(group => !group.archivedAt);
  }

  archivedGroups(): GoalGroup[] {
    return this.groups()
      .filter(group => group.archivedAt)
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  }

  createGoal(
    name: string,
    targetAmount: number,
    unit: string,
    goalType: GoalType,
    deadline: string | null,
    groupId: string | null,
    description = ''
  ): Goal {
    const goal: Goal = {
      id: uid(),
      groupId,
      name,
      description,
      targetAmount,
      unit: unit.trim().toLowerCase() || 'hours',
      goalType,
      deadline,
      logs: [],
      createdAt: Date.now()
    };
    this.goals.update(goals => [goal, ...goals]);
    return goal;
  }

  updateGoal(
    id: string,
    patch: Partial<Pick<Goal, 'name' | 'description' | 'targetAmount' | 'unit' | 'goalType' | 'deadline' | 'groupId'>>
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

  /** Returns whether this specific log is what pushed the goal from not-complete to complete,
   *  so the caller can celebrate exactly once, right when it's earned. */
  addLog(goalId: string, date: string, amount: number, note: string): { justCompleted: boolean } {
    const goal = this.goalById(goalId);
    const wasComplete = goal ? GoalsService.isGoalComplete(goal) : false;

    const entry: LogEntry = { id: uid(), date, amount, note: note.trim(), createdAt: Date.now() };
    let updated: Goal | undefined;
    this.goals.update(goals =>
      goals.map(g => {
        if (g.id !== goalId) return g;
        updated = { ...g, logs: [...g.logs, entry] };
        return updated;
      })
    );

    const isComplete = updated ? GoalsService.isGoalComplete(updated) : false;
    return { justCompleted: !wasComplete && isComplete };
  }

  deleteLog(goalId: string, logId: string): void {
    this.goals.update(goals =>
      goals.map(goal =>
        goal.id === goalId ? { ...goal, logs: goal.logs.filter(log => log.id !== logId) } : goal
      )
    );
  }

  importState(state: AppState): void {
    const normalized = normalizeState(state);
    this.groups.set(normalized.groups);
    this.goals.set(normalized.goals);
  }

  exportState(): AppState {
    return { groups: this.groups(), goals: this.goals() };
  }

  /** Reduces a set of amounts the way the goal's type dictates: summed for 'cumulative'
   *  goals, or just the largest single one for 'best' goals (e.g. "15 pull-ups in a row"
   *  is reached the moment one attempt hits 15 — earlier attempts don't add up). */
  static aggregateAmounts(goalType: GoalType | undefined, amounts: number[]): number {
    if (!amounts.length) return 0;
    return goalType === 'best' ? Math.max(...amounts) : amounts.reduce((sum, amount) => sum + amount, 0);
  }

  static amountForLogs(goalType: GoalType | undefined, logs: LogEntry[]): number {
    return GoalsService.aggregateAmounts(goalType, logs.map(log => Number(log.amount)));
  }

  static totalAmount(goal: Goal): number {
    return GoalsService.amountForLogs(goal.goalType, goal.logs);
  }

  static isGoalComplete(goal: Goal): boolean {
    return goal.targetAmount > 0 && GoalsService.totalAmount(goal) >= goal.targetAmount;
  }

  /** The date the goal actually crossed its target — the running total for 'cumulative' goals,
   *  or the first attempt that hit the target on its own for 'best' goals. Null if not complete. */
  static completedOn(goal: Goal): string | null {
    if (!GoalsService.isGoalComplete(goal)) return null;

    const sorted = [...goal.logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (goal.goalType === 'best') {
      const hit = sorted.find(log => Number(log.amount) >= goal.targetAmount);
      return hit?.date ?? null;
    }

    let running = 0;
    for (const log of sorted) {
      running += Number(log.amount);
      if (running >= goal.targetAmount) return log.date;
    }
    return null;
  }

  /** The earliest logged date — the day work on this goal actually started. Null only if the
   *  goal has no logs, which can't happen for a completed goal. */
  static firstLogDate(goal: Goal): string | null {
    return goal.logs.reduce<string | null>(
      (earliest, log) => (earliest === null || log.date < earliest ? log.date : earliest),
      null
    );
  }

  /** Calendar days between two ISO dates, never negative. Uses the same noon-anchored parsing
   *  as the rest of this service to avoid DST/timezone off-by-one on date-only strings. */
  static daysBetween(fromISO: string, toISO: string): number {
    const from = new Date(`${fromISO}T12:00:00`);
    const to = new Date(`${toISO}T12:00:00`);
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
  }

  /** How the completion date compares to the goal's deadline: positive = finished early,
   *  negative = finished late, 0 = exactly on the day, null = no deadline was set. */
  static deadlineDeltaDays(goal: Goal, onDateISO: string): number | null {
    if (!goal.deadline) return null;
    const deadline = new Date(`${goal.deadline}T12:00:00`);
    const done = new Date(`${onDateISO}T12:00:00`);
    return Math.round((deadline.getTime() - done.getTime()) / 86400000);
  }

  /** Per-calendar-date amounts, aggregated per the goal's type — the shared basis for daily
   *  averages and the trend chart, so multiple same-day logs behave consistently everywhere. */
  static perDayAmounts(goal: Goal): Record<string, number> {
    const byDate: Record<string, number[]> = {};
    for (const log of goal.logs) {
      (byDate[log.date] ??= []).push(Number(log.amount));
    }
    const result: Record<string, number> = {};
    for (const [date, amounts] of Object.entries(byDate)) {
      result[date] = GoalsService.aggregateAmounts(goal.goalType, amounts);
    }
    return result;
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

  static completedCount(goals: Goal[]): number {
    return goals.filter(goal => GoalsService.isGoalComplete(goal)).length;
  }

  static allComplete(goals: Goal[]): boolean {
    return goals.length > 0 && goals.every(goal => GoalsService.isGoalComplete(goal));
  }

  /** Incomplete goals first, then complete ones — stable within each bucket, so unrelated
   *  ordering (e.g. newest-first) isn't disturbed by completion alone. */
  static sortForDisplay(goals: Goal[]): Goal[] {
    return [...goals].sort(
      (a, b) => Number(GoalsService.isGoalComplete(a)) - Number(GoalsService.isGoalComplete(b))
    );
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

  /** The single biggest log entry ever recorded for this goal — a personal-best session. */
  static highestLoggedAmount(goal: Goal): number {
    return goal.logs.reduce((max, log) => Math.max(max, Number(log.amount)), 0);
  }

  /**
   * Average amount per *logged* day within the window ('all' = since the first entry).
   * Days with nothing logged are left out of the divisor, so e.g. 2h every other day
   * averages 2h — it measures typical session size, not calendar-day consistency.
   */
  static dailyAverageOverDays(goal: Goal, days: number | 'all'): number {
    let perDay = GoalsService.perDayAmounts(goal);

    if (days !== 'all') {
      const cursor = new Date(`${todayISO()}T12:00:00`);
      cursor.setDate(cursor.getDate() - (days - 1));
      const startISO = dateToISO(cursor);
      perDay = Object.fromEntries(Object.entries(perDay).filter(([date]) => date >= startISO));
    }

    const dayTotals = Object.values(perDay).filter(amount => amount > 0);
    if (!dayTotals.length) return 0;
    return dayTotals.reduce((sum, amount) => sum + amount, 0) / dayTotals.length;
  }
}
