import { AppState, LogEntry } from '../models/goal.model';

/** How long a delete is remembered as a tombstone. A device that syncs less often than this
 *  can resurrect what it deleted, which is the standard trade for not growing forever. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isLive(entity: { deletedAt: number | null }): boolean {
  return entity.deletedAt === null;
}

/** Drops tombstones old enough that every device has certainly seen them, so deleted
 *  entries don't accumulate in the synced payload forever. */
export function pruneTombstones(state: AppState, now: number): AppState {
  const expired = (deletedAt: number | null) => deletedAt !== null && now - deletedAt > TOMBSTONE_TTL_MS;
  return {
    groups: state.groups.filter(group => !expired(group.deletedAt)),
    goals: state.goals
      .filter(goal => !expired(goal.deletedAt))
      .map(goal => ({ ...goal, logs: goal.logs.filter(log => !expired(log.deletedAt)) }))
  };
}

/** Logs are append-only, so both sides' entries are always kept — a delete on either side
 *  wins, since un-deleting isn't something the app can do. */
export function mergeLogs(a: LogEntry[], b: LogEntry[]): LogEntry[] {
  const byId = new Map<string, LogEntry>();
  for (const log of [...a, ...b]) {
    const existing = byId.get(log.id);
    if (!existing) byId.set(log.id, log);
    else if (log.deletedAt !== null) byId.set(log.id, log);
  }
  return [...byId.values()].sort(byCreatedAtThenId);
}

/** Ties broken by id so the ordering can't depend on which side was passed first — see the
 *  ordering note on mergeStates. */
function byCreatedAtThenId(x: { createdAt: number; id: string }, y: { createdAt: number; id: string }): number {
  return x.createdAt - y.createdAt || x.id.localeCompare(y.id);
}

/** Newest first, matching how createGoal/createGroup prepend, so merging doesn't reshuffle
 *  the lists the user is looking at. */
function byNewestThenId(x: { createdAt: number; id: string }, y: { createdAt: number; id: string }): number {
  return y.createdAt - x.createdAt || x.id.localeCompare(y.id);
}

/**
 * Reconciles two copies of the app state that were edited independently.
 *
 * Union by id, so an entry created on either device always survives; where both sides know
 * an entity, the higher `updatedAt` wins its fields. A goal's logs merge separately from
 * its fields — otherwise renaming a goal on one device would discard the sessions logged
 * on the other, which is the data users would actually miss.
 *
 * The result is ordered canonically rather than by insertion. Two devices merging the same
 * pair of states must produce byte-identical output: the sync layer decides whether to push
 * by comparing serialized state, so a merge whose ordering depended on which side was
 * "local" would leave both devices pushing reordered-but-equal payloads at each other
 * indefinitely.
 */
export function mergeStates(local: AppState, remote: AppState, now = Date.now()): AppState {
  const mergeById = <T extends { id: string; updatedAt: number }>(a: T[], b: T[], combine: (x: T, y: T) => T): T[] => {
    const byId = new Map<string, T>();
    for (const entity of a) byId.set(entity.id, entity);
    for (const entity of b) {
      const existing = byId.get(entity.id);
      byId.set(entity.id, existing ? combine(existing, entity) : entity);
    }
    return [...byId.values()];
  };

  const groups = mergeById(local.groups, remote.groups, (x, y) => (y.updatedAt > x.updatedAt ? y : x)).sort(
    byNewestThenId
  );
  const goals = mergeById(local.goals, remote.goals, (x, y) => ({
    ...(y.updatedAt > x.updatedAt ? y : x),
    logs: mergeLogs(x.logs, y.logs)
  })).sort(byNewestThenId);

  return pruneTombstones({ groups, goals }, now);
}
