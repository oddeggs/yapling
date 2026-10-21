import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Every exported schema of the modules has samples: valid ones round-trip unchanged through JSON,
 * invalid ones fail.
 */
export const describeSchemas = (
  title: string,
  modules: Record<string, unknown>,
  samples: Record<string, readonly [valid: readonly unknown[], invalid: readonly unknown[]]>,
) =>
  describe(title, () => {
    const schemas = Object.entries(modules).filter(
      (entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType,
    );

    it('has samples for every exported schema', () => {
      expect(schemas.map(([name]) => name).filter((n) => !(n in samples))).toEqual([]);
      expect(Object.keys(samples).filter((n) => !schemas.some(([name]) => name === n))).toEqual([]);
    });

    it.each(schemas)('%s round-trips and rejects bad input', (name, schema) => {
      const [valid, invalid] = samples[name] ?? [[], []];
      expect(valid.length, `${name} has a valid sample`).toBeGreaterThan(0);
      expect(invalid.length, `${name} has an invalid sample`).toBeGreaterThan(0);
      for (const value of valid) {
        const parsed = schema.parse(value);
        expect(parsed).toEqual(value);
        expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(value);
      }
      for (const value of invalid) {
        expect(schema.safeParse(value).success, JSON.stringify(value)).toBe(false);
      }
    });
  });
