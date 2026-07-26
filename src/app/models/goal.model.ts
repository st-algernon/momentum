export interface LogEntry {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: number;
}

/** 'cumulative' adds every log together (e.g. hours studied); 'best' tracks your top single
 *  log instead, for goals like "15 pull-ups in a row" where attempts aren't meant to be summed. */
export type GoalType = 'cumulative' | 'best';

export interface Goal {
  id: string;
  groupId: string | null;
  name: string;
  description: string;
  targetAmount: number;
  unit: string;
  goalType: GoalType;
  deadline: string | null;
  logs: LogEntry[];
  createdAt: number;
}

export interface GoalGroup {
  id: string;
  name: string;
  description: string;
  archivedAt: number | null;
  createdAt: number;
}

export interface AppState {
  groups: GoalGroup[];
  goals: Goal[];
}
