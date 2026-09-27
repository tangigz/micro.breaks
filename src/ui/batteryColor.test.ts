import { describe, expect, it } from 'vitest';
import { batteryRgb } from './batteryColor';

describe('battery colour', () => {
  it('green when full, amber at half, coral when empty', () => {
    expect(batteryRgb(100)).toBe('111 207 122');
    expect(batteryRgb(50)).toBe('255 197 107');
    expect(batteryRgb(0)).toBe('255 138 91');
    expect(batteryRgb(-5)).toBe('255 138 91');
  });
});
