import type { RateLimiter } from '../application/ports';
import type { Clock } from '../shared/time';

interface QueueEntry {
  run: () => void;
}

export function createRateLimiter(clock: Clock, sleep: (ms: number) => Promise<void>): RateLimiter {
  let maxPerSecond = 1;
  let lastStartedAt = 0;
  let processing = false;
  const queue: QueueEntry[] = [];

  function minSpacingMs(): number {
    return Math.ceil(1000 / maxPerSecond);
  }

  async function drain(): Promise<void> {
    if (processing) {
      return;
    }
    processing = true;
    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry === undefined) {
        break;
      }
      const now = clock.now();
      const earliest = lastStartedAt + minSpacingMs();
      if (now < earliest) {
        await sleep(earliest - now);
      }
      lastStartedAt = clock.now();
      entry.run();
    }
    processing = false;
  }

  return {
    configure(nextMaxPerSecond: number): void {
      maxPerSecond = nextMaxPerSecond > 0 ? nextMaxPerSecond : 1;
    },
    run<T>(task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          run: () => {
            task().then(resolve, reject);
          },
        });
        void drain();
      });
    },
  };
}
