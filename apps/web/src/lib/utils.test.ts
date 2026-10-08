import { describe, expect, it } from 'vitest';

import { cn, getRoleLabel } from './utils';

describe('cn', () => {
  it('joins truthy class names with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('skips false, null, and undefined values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns an empty string when every value is falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('getRoleLabel', () => {
  it('maps known roles to human-readable labels', () => {
    expect(getRoleLabel('dev')).toBe('Dev');
    expect(getRoleLabel('tech_lead')).toBe('Tech Lead');
    expect(getRoleLabel('admin')).toBe('Admin');
  });

  it('is case-insensitive', () => {
    expect(getRoleLabel('ADMIN')).toBe('Admin');
  });

  it('falls back for unknown or missing roles', () => {
    expect(getRoleLabel('owner')).toBe('owner');
    expect(getRoleLabel(null)).toBe('Member');
    expect(getRoleLabel(undefined)).toBe('Member');
  });
});