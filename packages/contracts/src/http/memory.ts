import { z } from 'zod';

import { EpochMs, LIMITS, OpaqueId } from '../primitives';

/**
 * The sections of "What Pip remembers": about you (job, goals, favourite topics), coming up (dated
 * events Pip asks about later) and about us (inside jokes, stories, things Pip learned from you).
 */
export const MEMORY_CATEGORIES = ['about_you', 'coming_up', 'about_us'] as const;
export const MemoryCategory = z.enum(MEMORY_CATEGORIES);
export type MemoryCategory = z.infer<typeof MemoryCategory>;

const memoryText = z.string().min(1).max(500);

/** One thing Pip remembers. `sourceCallId`: the call it came from; null when the learner wrote it. */
export const MemoryItem = z.object({
  id: OpaqueId,
  text: memoryText,
  category: MemoryCategory,
  createdAt: EpochMs,
  sourceCallId: OpaqueId.nullable(),
});
export type MemoryItem = z.infer<typeof MemoryItem>;

/** `GET /api/me/memory`: everything, newest first. */
export const MemoryList = z.object({ items: z.array(MemoryItem).max(LIMITS.memoryItemsMax) });
export type MemoryList = z.infer<typeof MemoryList>;

/** `POST /api/me/memory`. */
export const MemoryCreate = z.object({ text: memoryText, category: MemoryCategory });
export type MemoryCreate = z.infer<typeof MemoryCreate>;

/** `PATCH /api/me/memory/:id`: the text, the category or both. */
export const MemoryUpdate = z
  .object({ text: memoryText, category: MemoryCategory })
  .partial()
  .refine((u) => u.text !== undefined || u.category !== undefined, {
    message: 'Change the text or the category',
  });
export type MemoryUpdate = z.infer<typeof MemoryUpdate>;
