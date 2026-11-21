import { describe, expect, it } from 'vitest';
import * as J from '../src/jokes';

const pools = { MANGLIK: J.MANGLIK, EDUCATION: J.EDUCATION, OCCUPATION: J.OCCUPATION, FATHER: J.FATHER, MOTHER: J.MOTHER, HOBBIES: J.HOBBIES, EXPECTATIONS: J.EXPECTATIONS };

describe('joke pools', () => {
  it.each(Object.entries(pools))('%s has 25+ unique, card-sized lines', (_, pool) => {
    expect(pool.length).toBeGreaterThanOrEqual(25);
    expect(new Set(pool).size).toBe(pool.length);
    for (const line of pool) expect(line.length).toBeLessThanOrEqual(80);
  });
  it('has advice for every verdict band', () => {
    for (const band of Object.values(J.ADVICE)) expect(band.length).toBeGreaterThanOrEqual(6);
  });
});
