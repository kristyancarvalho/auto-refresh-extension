import type { IdFactory } from '../application/ports';

export const cryptoIdFactory: IdFactory = {
  create(): string {
    return crypto.randomUUID();
  },
};
