import { describe, expect, it } from 'vitest';
import {
  BoostError,
  getBoostDurationMs,
  getBoostedRemainingMs,
  getRemainingWorkMs,
  getUpgradeGroup,
  validateBoostQuantity,
} from '../src/lib/boosts.ts';

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;

describe('boosts', () => {
  it('maps upgrade categories to display groups', () => {
    expect(getUpgradeGroup('home', 'buildings')).toBe('home');
    expect(getUpgradeGroup('home', 'heroes')).toBe('home');
    expect(getUpgradeGroup('home', 'guardians')).toBe('home');
    expect(getUpgradeGroup('home', 'units')).toBe('laboratory');
    expect(getUpgradeGroup('home', 'spells')).toBe('laboratory');
    expect(getUpgradeGroup('home', 'siege_machines')).toBe('laboratory');
    expect(getUpgradeGroup('home', 'pets')).toBe('pet');
    expect(getUpgradeGroup('builder', 'buildings2')).toBe('builderBase');
    expect(getUpgradeGroup('builder', 'units2')).toBe('builderBase');
  });

  it('calculates the boost duration from the selected quantity', () => {
    expect(getBoostDurationMs(1)).toBe(HOUR);
    expect(getBoostDurationMs(5)).toBe(5 * HOUR);
  });

  it('fits remaining work inside the boost window', () => {
    expect(getBoostedRemainingMs(10 * HOUR, 10, HOUR)).toBe(HOUR);
    expect(getBoostedRemainingMs(5 * HOUR, 10, HOUR)).toBe(30 * 60_000);
    expect(getBoostedRemainingMs(24 * HOUR, 24, HOUR)).toBe(HOUR);
  });

  it('continues at normal speed after the boost window', () => {
    expect(getBoostedRemainingMs(25 * HOUR, 10, HOUR)).toBe(16 * HOUR);
    expect(getBoostedRemainingMs(48 * HOUR, 24, HOUR)).toBe(25 * HOUR);
    expect(getBoostedRemainingMs(30 * HOUR, 10, 2 * HOUR)).toBe(12 * HOUR);
  });

  it('recovers normal work from a boosted countdown', () => {
    expect(getRemainingWorkMs(NOW + 5 * HOUR, NOW, null)).toBe(5 * HOUR);

    const activeBoost = { endsAt: NOW + HOUR, multiplier: 10 };

    expect(getRemainingWorkMs(NOW + 30 * 60_000, NOW, activeBoost)).toBe(5 * HOUR);
    expect(getRemainingWorkMs(NOW + 11 * HOUR, NOW + 30 * 60_000, activeBoost)).toBe(
      15 * HOUR,
    );
    expect(
      getRemainingWorkMs(NOW + 11 * HOUR, NOW + 2 * HOUR, {
        endsAt: NOW + HOUR,
        multiplier: 10,
      }),
    ).toBe(9 * HOUR);
  });

  it('accepts only whole quantities from 1 to 5', () => {
    expect(validateBoostQuantity(1)).toBe(1);
    expect(validateBoostQuantity(5)).toBe(5);

    for (const quantity of [0, 6, 1.5, '2', null, undefined]) {
      expect(() => validateBoostQuantity(quantity)).toThrow(BoostError);
    }
  });
});
