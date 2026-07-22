export interface LogEntry {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  groupId: string | null;
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
  createdAt: number;
}

export interface AppState {
  groups: GoalGroup[];
  goals: Goal[];
}
