import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('ignora valores falsy y une los strings con un espacio', () => {
    expect(cn('p-4', false, null, undefined, '', 0, 'text-sm')).toBe('p-4 text-sm');
  });

  it('aplana arrays anidados', () => {
    expect(cn(['flex', ['items-center', ['gap-2']]], 'p-4')).toBe(
      'flex items-center gap-2 p-4'
    );
  });

  it('incluye solo las claves activas del objeto', () => {
    expect(
      cn('base', { active: true, disabled: false, muted: true })
    ).toBe('base active muted');
  });
});
