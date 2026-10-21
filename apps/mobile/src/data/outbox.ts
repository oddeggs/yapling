import { MemoryCreate, MemoryUpdate, OpaqueId, ProfileUpdate } from '@yapling/contracts';
import { z } from 'zod';

import { isDataError, type DataError } from './errors';
import { CACHE_KEYS, readJson, writeJson, type CacheStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * Writes made while the API can't be reached, kept in the cache and sent in order once it answers
 * again. Only writes that are safe to send late go here: profile patches and memory edits. Progress
 * never queues; it goes through its revision. A write the server refuses when it finally goes is
 * dropped, and its resource is read again from the server, whose copy wins.
 */

const OutboxOp = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('profile.patch'), body: ProfileUpdate }),
  z.object({
    id: z.string(),
    kind: z.literal('memory.create'),
    /** The item's id on the phone until the server names it. */
    localId: OpaqueId,
    body: MemoryCreate,
  }),
  z.object({
    id: z.string(),
    kind: z.literal('memory.update'),
    itemId: OpaqueId,
    body: MemoryUpdate,
  }),
  z.object({ id: z.string(), kind: z.literal('memory.delete'), itemId: OpaqueId }),
]);
export type OutboxOp = z.infer<typeof OutboxOp>;
type NewOp = OutboxOp extends infer O ? (O extends OutboxOp ? Omit<O, 'id'> : never) : never;

const Queue = z.array(OutboxOp).max(500);

/** What sending one op came to. `memory.create` names the server's id for the local one. */
export type OpOutcome = { readonly createdId?: string };

export type RunOp = (op: OutboxOp) => Promise<OpOutcome>;

export interface OutboxState {
  readonly pending: number;
  readonly flushing: boolean;
  /** The last op the server refused when it went late, for the UI to explain. */
  readonly dropped: { readonly kind: OutboxOp['kind']; readonly error: DataError['kind'] } | null;
}

export type OpResource = 'profile' | 'memory';

const resourceOf = (op: OutboxOp): OpResource =>
  op.kind === 'profile.patch' ? 'profile' : 'memory';

export const isLocalId = (id: string): boolean => id.startsWith('local_');

let counter = 0;
const opId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export class Outbox {
  readonly store: Store<OutboxState> = createStore<OutboxState>({
    pending: 0,
    flushing: false,
    dropped: null,
  });
  private ops: OutboxOp[] = [];
  private flushing: Promise<void> | null = null;
  private loading: Promise<void> | null = null;
  /** The op on its way: new ops never fold into it. */
  private sending: string | null = null;

  constructor(
    private readonly cache: CacheStorage,
    private readonly run: RunOp,
    /** After a flush that dropped refused ops: their resources, to read again from the server. */
    private readonly onDropped: (resources: ReadonlySet<OpResource>) => void = () => undefined,
  ) {}

  get pending(): readonly OutboxOp[] {
    return this.ops;
  }

  /** Whether any queued op touches `kind`'s resource (`profile` or `memory`). */
  touches(resource: OpResource): boolean {
    return this.ops.some((op) => resourceOf(op) === resource);
  }

  /** Reads what an earlier launch left queued. */
  load(): Promise<void> {
    this.loading ??= (async () => {
      const stored = (await readJson(this.cache, CACHE_KEYS.outbox, Queue)) ?? [];
      this.ops = [...stored, ...this.ops];
      this.publish();
    })();
    return this.loading;
  }

  /** Queues a write, folding it into the ones already waiting where it can. */
  async add(op: NewOp): Promise<void> {
    await this.load();
    const next = { ...op, id: opId() };
    const head = this.ops[0];
    this.ops =
      head !== undefined && head.id === this.sending
        ? [head, ...fold(this.ops.slice(1), next)]
        : fold(this.ops, next);
    await this.persist();
  }

  /** Sends what waits, in order, until the network fails again. */
  flush(): Promise<void> {
    this.flushing ??= this.drain().finally(() => {
      this.flushing = null;
      this.publish();
    });
    return this.flushing;
  }

  async clear(): Promise<void> {
    this.ops = [];
    await this.persist();
  }

  private async drain(): Promise<void> {
    await this.load();
    this.store.set((s) => ({ ...s, flushing: true }));
    const dropped = new Set<OpResource>();
    try {
      await this.drainInto(dropped);
    } finally {
      if (dropped.size > 0) this.onDropped(dropped);
    }
  }

  private async drainInto(dropped: Set<OpResource>): Promise<void> {
    for (;;) {
      const op = this.ops[0];
      if (op === undefined) return;
      let outcome: OpOutcome;
      this.sending = op.id;
      try {
        outcome = await this.run(op);
      } catch (error) {
        this.sending = null;
        if (isDataError(error, 'network')) return;
        this.ops = this.ops.slice(1);
        await this.persist();
        this.store.set((s) => ({
          ...s,
          dropped: { kind: op.kind, error: isDataError(error) ? error.kind : 'server' },
        }));
        dropped.add(resourceOf(op));
        continue;
      }
      this.sending = null;
      this.ops = this.ops.slice(1);
      if (op.kind === 'memory.create' && outcome.createdId !== undefined)
        this.ops = renameItem(this.ops, op.localId, outcome.createdId);
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    this.publish();
    await writeJson(this.cache, CACHE_KEYS.outbox, this.ops.length === 0 ? null : this.ops);
  }

  private publish(): void {
    this.store.set((s) => ({ ...s, pending: this.ops.length, flushing: this.flushing !== null }));
  }
}

/** Later ops on an item the server hasn't named yet refer to it by its server id once it has one. */
function renameItem(ops: OutboxOp[], from: string, to: string): OutboxOp[] {
  return ops.map((op) =>
    (op.kind === 'memory.update' || op.kind === 'memory.delete') && op.itemId === from
      ? { ...op, itemId: to }
      : op,
  );
}

/**
 * Folds a new op into the queue: patches of the profile merge, an edit of an item still waiting to
 * be created changes the create, and deleting such an item drops it and its edits entirely.
 */
export function fold(ops: OutboxOp[], op: OutboxOp): OutboxOp[] {
  const last = ops[ops.length - 1];
  if (op.kind === 'profile.patch' && last?.kind === 'profile.patch')
    return [...ops.slice(0, -1), { ...last, body: { ...last.body, ...op.body } }];
  if (op.kind === 'memory.update' && isLocalId(op.itemId)) {
    const i = ops.findIndex((o) => o.kind === 'memory.create' && o.localId === op.itemId);
    const create = ops[i];
    if (create?.kind === 'memory.create')
      return ops.map((o, j) =>
        j === i ? { ...create, body: { ...create.body, ...definedOf(op.body) } } : o,
      );
  }
  if (op.kind === 'memory.delete' && isLocalId(op.itemId)) {
    const queued = ops.some((o) => o.kind === 'memory.create' && o.localId === op.itemId);
    if (queued)
      return ops.filter(
        (o) =>
          !(o.kind === 'memory.create' && o.localId === op.itemId) &&
          !((o.kind === 'memory.update' || o.kind === 'memory.delete') && o.itemId === op.itemId),
      );
  }
  return [...ops, op];
}

function definedOf(update: MemoryUpdate): Partial<MemoryCreate> {
  return Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined));
}
