import { TestBed } from '@angular/core/testing';
import { GoalsService, todayISO } from './goals.service';

describe('GoalsService', () => {
  let service: GoalsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoalsService);
  });

  it('starts with no goals', () => {
    expect(service.goals()).toEqual([]);
    expect(service.activeGoal()).toBeNull();
  });

  it('creates a goal and makes it active', () => {
    service.createGoal('Study system design', 100, null);
    expect(service.goals().length).toBe(1);
    expect(service.activeGoal()?.name).toBe('Study system design');
  });

  it('adds logs and computes total hours', () => {
    service.createGoal('Study system design', 100, null);
    const goal = service.activeGoal()!;
    service.addLog(goal.id, todayISO(), 2, 'joins');
    service.addLog(goal.id, todayISO(), 1.5, 'indexes');
    const updated = service.activeGoal()!;
    expect(GoalsService.totalHours(updated)).toBe(3.5);
  });

  it('computes current streak across consecutive days', () => {
    service.createGoal('Study system design', 100, null);
    const goal = service.activeGoal()!;
    const today = new Date(`${todayISO()}T12:00:00`);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    service.addLog(goal.id, today.toISOString().slice(0, 10), 1, '');
    service.addLog(goal.id, yesterday.toISOString().slice(0, 10), 1, '');

    expect(GoalsService.currentStreak(service.activeGoal()!)).toBe(2);
  });

  it('deletes a log entry', () => {
    service.createGoal('Study system design', 100, null);
    const goal = service.activeGoal()!;
    service.addLog(goal.id, todayISO(), 2, 'joins');
    const log = service.activeGoal()!.logs[0];

    service.deleteLog(goal.id, log.id);
    expect(service.activeGoal()!.logs.length).toBe(0);
  });

  it('deletes a goal and falls back active goal to the next one', () => {
    service.createGoal('Goal A', 10, null);
    service.createGoal('Goal B', 20, null);
    const goalB = service.activeGoal()!;

    service.deleteGoal(goalB.id);
    expect(service.goals().length).toBe(1);
    expect(service.activeGoal()?.name).toBe('Goal A');
  });

  it('round-trips export/import state', () => {
    service.createGoal('Goal A', 10, null);
    const exported = service.exportState();

    service.deleteGoal(exported.goals[0].id);
    expect(service.goals().length).toBe(0);

    service.importState(exported);
    expect(service.goals().length).toBe(1);
    expect(service.activeGoal()?.name).toBe('Goal A');
  });

  it('persists state to localStorage', () => {
    service.createGoal('Goal A', 10, null);
    TestBed.flushEffects();
    const raw = localStorage.getItem('skilltrack-data-v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).goals[0].name).toBe('Goal A');
  });
});
