import { z } from 'zod';

/** A model's text, cut to `max` characters instead of refused for running long. */
export const clip = (max: number) => z.string().transform((s) => s.slice(0, max));
