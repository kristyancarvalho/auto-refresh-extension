import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../../../src/infrastructure/rate-limiter';
import type { Clock } from '../../../src/shared/time';

function createControllableClock(start = 0): {
  clock: Clock;
  sleep: (ms: number) => Promise<void>;
} {
  let current = start;
  const clock: Clock = {
    now() {
      return current;
    },
  };
  const sleep = (ms: number): Promise<void> => {
    current += ms;
    return Promise.resolve();
  };
  return { clock, sleep };
}

describe('createRateLimiter', () => {
  it('preserves submission order when draining the queue', async () => {
    const { clock, sleep } = createControllableClock();
    const limiter = createRateLimiter(clock, sleep);
    limiter.configure(3);
    const order: number[] = [];
    await Promise.all([
      limiter.run(async () => {
        order.push(1);
      }),
      limiter.run(async () => {
        order.push(2);
      }),
      limiter.run(async () => {
        order.push(3);
      }),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('resolves with the task result and propagates rejections', async () => {
    const { clock, sleep } = createControllableClock();
    const limiter = createRateLimiter(clock, sleep);
    await expect(limiter.run(async () => 42)).resolves.toBe(42);
    await expect(limiter.run(async () => Promise.reject(new Error('nope')))).rejects.toThrow(
      'nope',
    );
  });

  it('spaces executions according to the configured rate', async () => {
    const { clock, sleep } = createControllableClock();
    const limiter = createRateLimiter(clock, sleep);
    limiter.configure(2);
    const timestamps: number[] = [];
    await Promise.all([
      limiter.run(async () => {
        timestamps.push(clock.now());
      }),
      limiter.run(async () => {
        timestamps.push(clock.now());
      }),
      limiter.run(async () => {
        timestamps.push(clock.now());
      }),
    ]);
    expect(timestamps).toEqual([500, 1000, 1500]);
  });
});
