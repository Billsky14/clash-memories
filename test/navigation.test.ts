import { describe, expect, it } from 'vitest';
import {
  getLandingSectionFromPath,
  getPageFromPath,
  isLandingSectionId,
  normalizePathname,
} from '../src/lib/navigation.ts';

describe('path routing', () => {
  it('maps the landing page and tracker page', () => {
    expect(getPageFromPath('/')).toBe('landing');
    expect(getPageFromPath('/landing')).toBe('landing');
    expect(getPageFromPath('/dasbor')).toBe('landing');
    expect(getPageFromPath('/fitur')).toBe('landing');
    expect(getPageFromPath('/tracker')).toBe('tracker');
    expect(getPageFromPath('/tracker/')).toBe('tracker');
    expect(getPageFromPath('/unknown')).toBe('landing');
  });

  it('maps landing sections from their paths', () => {
    expect(getLandingSectionFromPath('/fitur')).toBe('fitur');
    expect(getLandingSectionFromPath('/cara-kerja')).toBe('cara-kerja');
    expect(getLandingSectionFromPath('/booster')).toBe('booster');
    expect(getLandingSectionFromPath('/faq')).toBe('faq');
    expect(getLandingSectionFromPath('/fitur/')).toBe('fitur');
    expect(getLandingSectionFromPath('/')).toBeNull();
    expect(getLandingSectionFromPath('/tracker')).toBeNull();
  });

  it('normalizes trailing slashes', () => {
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('/tracker/')).toBe('/tracker');
    expect(normalizePathname('/cara-kerja///')).toBe('/cara-kerja');
  });

  it('recognizes only landing section ids', () => {
    expect(isLandingSectionId('fitur')).toBe(true);
    expect(isLandingSectionId('faq')).toBe(true);
    expect(isLandingSectionId('tracker')).toBe(false);
    expect(isLandingSectionId('dasbor')).toBe(false);
  });
});
