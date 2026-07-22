export interface LogEntry {
  id: string;
  date: string;
  hours: number;
  note: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  targetHours: number;
  deadline: string | null;
  logs: LogEntry[];
  createdAt: number;
}

export interface AppState {
  goals: Goal[];
  activeGoalId: string | null;
}
