/** `deletedAt` is a tombstone rather than an outright removal: sync merges the union of
 *  both devices' entities, so an entry that simply vanished from one side would be
 *  resurrected by the other. Tombstones are pruned once they're older than the sync
 *  window (see TOMBSTONE_TTL_MS) and are never shown in the UI. */
export interface LogEntry {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: number;
  deletedAt: number | null;
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
  archivedAt: number | null;
  createdAt: number;
  /** Last edit to this goal's own fields — the tiebreak when both devices changed it.
   *  Deliberately NOT bumped by log changes, which merge independently of the fields. */
  updatedAt: number;
  deletedAt: number | null;
}

export interface GoalGroup {
  id: string;
  name: string;
  description: string;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface AppState {
  groups: GoalGroup[];
  goals: Goal[];
}
