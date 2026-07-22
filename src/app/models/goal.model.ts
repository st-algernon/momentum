export interface LogEntry {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  unit: string;
  deadline: string | null;
  logs: LogEntry[];
  createdAt: number;
}

export interface GoalGroup {
  id: string;
  name: string;
  goals: Goal[];
  createdAt: number;
}

export interface AppState {
  groups: GoalGroup[];
  activeGroupId: string | null;
  activeGoalId: string | null;
}
