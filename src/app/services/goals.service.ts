import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, Goal, GoalGroup, LogEntry } from '../models/goal.model';

const STORAGE_KEY = 'skilltrack-data-v2';
const LEGACY_STORAGE_KEY = 'skilltrack-data-v1';

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

interface LegacyGoal {
  id: string;
  name: string;
  targetHours: number;
  deadline: string | null;
  logs: { id: string; date: string; hours: number; note: string; createdAt: number }[];
  createdAt: number;
}

interface LegacyState {
  goals: LegacyGoal[];
  activeGoalId: string | null;
}

function migrateLegacyState(legacy: LegacyState): AppState {
  const goals: Goal[] = legacy.goals.map(goal => ({
    id: goal.id,
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

  if (!goals.length) return { groups: [], activeGroupId: null, activeGoalId: null };

  const group: GoalGroup = { id: uid(), name: 'My Goals', goals, createdAt: Date.now() };
  return { groups: [group], activeGroupId: group.id, activeGoalId: legacy.activeGoalId };
}

function loadState(): AppState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.groups)) return saved;
  } catch (error) {
    console.warn('Could not read saved data.', error);
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null');
    if (legacy && Array.isArray(legacy.goals)) return migrateLegacyState(legacy);
  } catch (error) {
    console.warn('Could not read legacy data.', error);
  }

  return { groups: [], activeGroupId: null, activeGoalId: null };
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly initial = loadState();

  readonly groups = signal<GoalGroup[]>(this.initial.groups);
  readonly activeGroupId = signal<string | null>(this.initial.activeGroupId);
  readonly activeGoalId = signal<string | null>(this.initial.activeGoalId);

  readonly activeGroup = computed<GoalGroup | null>(() => {
    const groups = this.groups();
    return groups.find(group => group.id === this.activeGroupId()) ?? groups[0] ?? null;
  });

  readonly activeGoal = computed<Goal | null>(() => {
    const group = this.activeGroup();
    if (!group) return null;
    return group.goals.find(goal => goal.id === this.activeGoalId()) ?? group.goals[0] ?? null;
  });

  constructor() {
    effect(() => {
      const state: AppState = {
        groups: this.groups(),
        activeGroupId: this.activeGroupId(),
        activeGoalId: this.activeGoalId()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });

    effect(() => {
      const groups = this.groups();
      const activeId = this.activeGroupId();
      if (groups.length && !groups.some(group => group.id === activeId)) {
        this.activeGroupId.set(groups[0].id);
      }
    });

    effect(() => {
      const group = this.activeGroup();
      const activeGoalId = this.activeGoalId();
      if (group?.goals.length && !group.goals.some(goal => goal.id === activeGoalId)) {
        this.activeGoalId.set(group.goals[0].id);
      }
    });
  }

  selectGroup(id: string): void {
    this.activeGroupId.set(id);
  }

  selectGoal(id: string): void {
    this.activeGoalId.set(id);
  }

  createGroup(name: string): void {
    const group: GoalGroup = { id: uid(), name, goals: [], createdAt: Date.now() };
    this.groups.update(groups => [group, ...groups]);
    this.activeGroupId.set(group.id);
  }

  deleteGroup(id: string): void {
    this.groups.update(groups => groups.filter(group => group.id !== id));
    if (this.activeGroupId() === id) {
      this.activeGroupId.set(this.groups()[0]?.id ?? null);
    }
  }

  createGoal(groupId: string, name: string, targetAmount: number, unit: string, deadline: string | null): void {
    const goal: Goal = {
      id: uid(),
      name,
      targetAmount,
      unit: unit.trim().toLowerCase() || 'hours',
      deadline,
      logs: [],
      createdAt: Date.now()
    };
    this.groups.update(groups =>
      groups.map(group => (group.id === groupId ? { ...group, goals: [goal, ...group.goals] } : group))
    );
    this.activeGoalId.set(goal.id);
  }

  deleteGoal(groupId: string, goalId: string): void {
    this.groups.update(groups =>
      groups.map(group =>
        group.id === groupId ? { ...group, goals: group.goals.filter(goal => goal.id !== goalId) } : group
      )
    );
    if (this.activeGoalId() === goalId) {
      const group = this.groups().find(g => g.id === groupId);
      this.activeGoalId.set(group?.goals[0]?.id ?? null);
    }
  }

  addLog(groupId: string, goalId: string, date: string, amount: number, note: string): void {
    const entry: LogEntry = { id: uid(), date, amount, note: note.trim(), createdAt: Date.now() };
    this.groups.update(groups =>
      groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              goals: group.goals.map(goal =>
                goal.id === goalId ? { ...goal, logs: [...goal.logs, entry] } : goal
              )
            }
          : group
      )
    );
  }

  deleteLog(groupId: string, goalId: string, logId: string): void {
    this.groups.update(groups =>
      groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              goals: group.goals.map(goal =>
                goal.id === goalId ? { ...goal, logs: goal.logs.filter(log => log.id !== logId) } : goal
              )
            }
          : group
      )
    );
  }

  importState(state: AppState): void {
    this.groups.set(state.groups);
    this.activeGroupId.set(state.activeGroupId ?? state.groups[0]?.id ?? null);
    this.activeGoalId.set(state.activeGoalId ?? state.groups[0]?.goals[0]?.id ?? null);
  }

  exportState(): AppState {
    return { groups: this.groups(), activeGroupId: this.activeGroupId(), activeGoalId: this.activeGoalId() };
  }

  static totalAmount(goal: Goal): number {
    return goal.logs.reduce((sum, log) => sum + Number(log.amount), 0);
  }

  static goalPercent(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min(100, (GoalsService.totalAmount(goal) / goal.targetAmount) * 100);
  }

  static groupPercent(group: GoalGroup): number {
    if (!group.goals.length) return 0;
    const total = group.goals.reduce((sum, goal) => sum + GoalsService.goalPercent(goal), 0);
    return total / group.goals.length;
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
