import { describe, expect, it } from 'vitest';
import { getGameName, getNextLevel } from '../src/lib/gameData.ts';

describe('getGameName', () => {
  it('maps home army buildings exposed through named accessors', () => {
    expect(getGameName('home', 1000006)).toBe('Barracks');
    expect(getGameName('home', 1000007)).toBe('Laboratory');
    expect(getGameName('home', 1000068)).toBe('Pet House');
  });

  it('maps home helper buildings', () => {
    expect(getGameName('home', 1000093)).toBe('Helper Hut');
  });

  it('keeps army camp and builder base lookups working', () => {
    expect(getGameName('home', 1000000)).toBe('Army Camp');
    expect(getGameName('builder', 1000040)).toBe('Builder Barracks');
  });

  it('falls back to the raw data id for unknown entries', () => {
    expect(getGameName('home', 9_999_999)).toBe('Upgrade #9999999');
  });
});

describe('getNextLevel', () => {
  it('uses the real level tables for army buildings', () => {
    expect(getNextLevel('home', 1000006, 18)).toBe(19);
    expect(getNextLevel('home', 1000007, 13)).toBe(14);
    expect(getNextLevel('home', 1000068, 11)).toBe(12);
  });

  it('falls back to the next level for unknown entries', () => {
    expect(getNextLevel('home', 9_999_999, 4)).toBe(5);
  });
});
